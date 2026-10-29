import AsyncStorage from '@react-native-async-storage/async-storage';

import { exercicios } from '@/constants/exercicios';
import {
  isStoredWorkoutProgress,
  type CompletedSetsByWorkout,
} from '@/store/workout-progress-slice';

const WORKOUTS_KEY = 'evolift.workouts';
export const WORKOUT_PROGRESS_STORAGE_KEY = 'evolift.workout-progress';
const WORKOUT_SHARE_PREFIX = 'EVOLIFT:';
const APP_BACKUP_PREFIX = 'EVOLIFT-BACKUP:';

type WorkoutSharePayload = {
  format: 'evolift-workout';
  version: 1;
  workout: {
    nome: string;
    exercicios: WorkoutInput['exercicios'];
  };
};

type AppBackupPayload = {
  format: 'evolift-backup';
  version: 1;
  workouts: {
    id: number;
    nome: string;
    exercicios: WorkoutInput['exercicios'];
  }[];
  completedByWorkout: CompletedSetsByWorkout;
};

export type WorkoutExercise = {
  exercicioId: number;
  exercicio: (typeof exercicios)[number];
  posicao: number;
  quantidadeSeries: number;
  quantidadeExecucoes: number;
  peso: number | null;
};

export type Workout = {
  id: number;
  nome: string;
  exercicios: WorkoutExercise[];
};

export type WorkoutInput = {
  nome: string;
  exercicios: {
    exercicioId: number;
    posicao: number;
    quantidadeSeries: number;
    quantidadeExecucoes: number;
    peso: number | null;
  }[];
};

type StoredWorkoutExercise = Omit<WorkoutExercise, 'peso'> & {
  peso?: number | null;
  pesoMaximo?: number | null;
};

type StoredWorkout = Omit<Workout, 'exercicios'> & {
  exercicios: StoredWorkoutExercise[];
};

let workoutWriteQueue: Promise<void> = Promise.resolve();

export async function listWorkouts(): Promise<Workout[]> {
  const stored = await AsyncStorage.getItem(WORKOUTS_KEY);
  if (stored === null) {
    return [];
  }

  const parsed: unknown = JSON.parse(stored);
  if (!isWorkoutList(parsed)) {
    throw new Error('Os treinos salvos localmente estão em um formato inválido.');
  }
  return parsed.map((workout) => ({
    ...workout,
    exercicios: workout.exercicios.map(({ pesoMaximo, ...exercise }) => ({
      ...exercise,
      peso: exercise.peso !== undefined ? exercise.peso : pesoMaximo ?? null,
    })),
  }));
}

export async function getWorkout(workoutId: string): Promise<Workout> {
  const workout = (await listWorkouts()).find((item) => String(item.id) === workoutId);
  if (!workout) {
    throw new Error('O treino solicitado não foi encontrado.');
  }
  return workout;
}

export async function createWorkout(input: WorkoutInput): Promise<Workout> {
  return serializeWorkoutWrite(async () => {
    const workouts = await listWorkouts();
    const workout = buildWorkout(input, nextWorkoutId(workouts));
    await saveWorkouts([...workouts, workout]);
    return workout;
  });
}

export async function updateWorkout(workoutId: string, input: WorkoutInput): Promise<Workout> {
  return serializeWorkoutWrite(async () => {
    const workouts = await listWorkouts();
    const index = workouts.findIndex((item) => String(item.id) === workoutId);
    if (index < 0) {
      throw new Error('O treino solicitado não foi encontrado.');
    }

    const workout = buildWorkout(input, workouts[index].id);
    const updated = [...workouts];
    updated[index] = workout;
    await saveWorkouts(updated);
    return workout;
  });
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  return serializeWorkoutWrite(async () => {
    const workouts = await listWorkouts();
    const workoutIndex = workouts.findIndex((item) => String(item.id) === workoutId);
    if (workoutIndex < 0) {
      throw new Error('O treino solicitado não foi encontrado.');
    }

    await saveWorkouts(workouts.filter((_, index) => index !== workoutIndex));
  });
}

export async function updateWorkoutExerciseWeight(
  workoutId: string,
  exerciseIndex: number,
  peso: number | null,
): Promise<Workout> {
  if (!Number.isSafeInteger(exerciseIndex) || exerciseIndex < 0 || !isValidWeight(peso)) {
    throw new Error('O peso informado para o exercício é inválido.');
  }

  return serializeWorkoutWrite(async () => {
    const workouts = await listWorkouts();
    const workoutIndex = workouts.findIndex((item) => String(item.id) === workoutId);
    if (workoutIndex < 0) {
      throw new Error('O treino solicitado não foi encontrado.');
    }

    const workout = workouts[workoutIndex];
    if (exerciseIndex >= workout.exercicios.length) {
      throw new Error('O exercício solicitado não foi encontrado neste treino.');
    }

    const updatedWorkout: Workout = {
      ...workout,
      exercicios: workout.exercicios.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, peso } : exercise,
      ),
    };
    const updatedWorkouts = [...workouts];
    updatedWorkouts[workoutIndex] = updatedWorkout;
    await saveWorkouts(updatedWorkouts);
    return updatedWorkout;
  });
}

export function createWorkoutShareCode(workout: Workout): string {
  const payload: WorkoutSharePayload = {
    format: 'evolift-workout',
    version: 1,
    workout: {
      nome: workout.nome,
      exercicios: workout.exercicios.map(
        ({ exercicioId, posicao, quantidadeSeries, quantidadeExecucoes, peso }) => ({
          exercicioId,
          posicao,
          quantidadeSeries,
          quantidadeExecucoes,
          peso,
        }),
      ),
    },
  };
  return `${WORKOUT_SHARE_PREFIX}${JSON.stringify(payload)}`;
}

export function createAppBackupCode(
  workouts: Workout[],
  completedByWorkout: CompletedSetsByWorkout,
): string {
  const payload: AppBackupPayload = {
    format: 'evolift-backup',
    version: 1,
    workouts: workouts.map((workout) => ({
      id: workout.id,
      nome: workout.nome,
      exercicios: workout.exercicios.map(
        ({ exercicioId, posicao, quantidadeSeries, quantidadeExecucoes, peso }) => ({
          exercicioId,
          posicao,
          quantidadeSeries,
          quantidadeExecucoes,
          peso,
        }),
      ),
    })),
    completedByWorkout,
  };
  return `${APP_BACKUP_PREFIX}${JSON.stringify(payload)}`;
}

export async function restoreAppBackupFromCode(
  code: string,
): Promise<{ workouts: Workout[]; completedByWorkout: CompletedSetsByWorkout }> {
  const trimmedCode = code.trim();
  if (!trimmedCode.startsWith(APP_BACKUP_PREFIX)) {
    throw new Error('Código de backup inválido. Confira se copiou o código completo.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmedCode.slice(APP_BACKUP_PREFIX.length));
  } catch {
    throw new Error('O código de backup está corrompido ou incompleto.');
  }

  if (!isAppBackupPayload(parsed)) {
    throw new Error('O backup não contém dados válidos ou usa uma versão incompatível.');
  }

  return serializeWorkoutWrite(async () => {
    const workouts = parsed.workouts.map((workout) =>
      buildWorkout({ nome: workout.nome, exercicios: workout.exercicios }, workout.id),
    );
    const completedByWorkout = parsed.completedByWorkout;
    await AsyncStorage.multiSet([
      [WORKOUTS_KEY, JSON.stringify(workouts)],
      [WORKOUT_PROGRESS_STORAGE_KEY, JSON.stringify(completedByWorkout)],
    ]);
    return { workouts, completedByWorkout };
  });
}

export async function importWorkoutFromCode(code: string): Promise<Workout> {
  const trimmedCode = code.trim();
  if (!trimmedCode.startsWith(WORKOUT_SHARE_PREFIX)) {
    throw new Error('Código inválido. Confira se copiou o código completo do treino.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmedCode.slice(WORKOUT_SHARE_PREFIX.length));
  } catch {
    throw new Error('O código do treino está corrompido ou incompleto.');
  }

  if (!isWorkoutSharePayload(parsed)) {
    throw new Error('O código não contém um treino válido ou usa uma versão incompatível.');
  }

  return createWorkout({
    nome: parsed.workout.nome.trim(),
    exercicios: parsed.workout.exercicios,
  });
}

function buildWorkout(input: WorkoutInput, id: number): Workout {
  const name = input.nome.trim();
  if (!name || name.length > 100 || input.exercicios.length === 0) {
    throw new Error('O treino precisa de um nome válido e pelo menos um exercício.');
  }

  return {
    id,
    nome: name,
    exercicios: input.exercicios.map((item) => {
      if (
        !isPositiveSafeInteger(item.exercicioId) ||
        !isPositiveSafeInteger(item.posicao) ||
        !isPositiveSafeInteger(item.quantidadeSeries) ||
        !isPositiveSafeInteger(item.quantidadeExecucoes) ||
        !isValidWeight(item.peso)
      ) {
        throw new Error('Os dados do exercício são inválidos.');
      }

      const exercise = exercicios.find((candidate) => candidate.id === item.exercicioId);
      if (!exercise) {
        throw new Error(`O exercício ${item.exercicioId} não existe no catálogo local.`);
      }
      return {
        ...item,
        exercicio: exercise,
      };
    }),
  };
}

function nextWorkoutId(workouts: Workout[]): number {
  return workouts.reduce((maximum, workout) => Math.max(maximum, workout.id), 0) + 1;
}

async function saveWorkouts(workouts: Workout[]): Promise<void> {
  await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
}

function serializeWorkoutWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = workoutWriteQueue.then(operation, operation);
  workoutWriteQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function isWorkoutList(value: unknown): value is StoredWorkout[] {
  return Array.isArray(value) && value.every(isWorkout);
}

function isWorkout(value: unknown): value is StoredWorkout {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    !Number.isSafeInteger(value.id) ||
    !('nome' in value) ||
    typeof value.nome !== 'string' ||
    !('exercicios' in value) ||
    !Array.isArray(value.exercicios)
  ) {
    return false;
  }

  return value.exercicios.every(
    (item: unknown) =>
      typeof item === 'object' &&
      item !== null &&
      'exercicioId' in item &&
      Number.isSafeInteger(item.exercicioId) &&
      'posicao' in item &&
      Number.isSafeInteger(item.posicao) &&
      'quantidadeSeries' in item &&
      Number.isSafeInteger(item.quantidadeSeries) &&
      'quantidadeExecucoes' in item &&
      Number.isSafeInteger(item.quantidadeExecucoes) &&
      (!('peso' in item) || isValidWeight(item.peso)) &&
      (!('pesoMaximo' in item) || isValidWeight(item.pesoMaximo)) &&
      'exercicio' in item &&
      typeof item.exercicio === 'object' &&
      item.exercicio !== null &&
      'id' in item.exercicio &&
      Number.isSafeInteger(item.exercicio.id) &&
      'nome' in item.exercicio &&
      typeof item.exercicio.nome === 'string' &&
      'video' in item.exercicio &&
      typeof item.exercicio.video === 'string',
  );
}

function isValidWeight(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' && Number.isFinite(value) && value >= 0)
  );
}

function isWorkoutSharePayload(value: unknown): value is WorkoutSharePayload {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('format' in value) ||
    value.format !== 'evolift-workout' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('workout' in value) ||
    typeof value.workout !== 'object' ||
    value.workout === null ||
    !('nome' in value.workout) ||
    typeof value.workout.nome !== 'string' ||
    value.workout.nome.trim().length === 0 ||
    value.workout.nome.trim().length > 100 ||
    !('exercicios' in value.workout) ||
    !Array.isArray(value.workout.exercicios) ||
    value.workout.exercicios.length === 0
  ) {
    return false;
  }

  return value.workout.exercicios.every(
    (exercise: unknown) =>
      typeof exercise === 'object' &&
      exercise !== null &&
      'exercicioId' in exercise &&
      isPositiveSafeInteger(exercise.exercicioId) &&
      'posicao' in exercise &&
      isPositiveSafeInteger(exercise.posicao) &&
      'quantidadeSeries' in exercise &&
      isPositiveSafeInteger(exercise.quantidadeSeries) &&
      'quantidadeExecucoes' in exercise &&
      isPositiveSafeInteger(exercise.quantidadeExecucoes) &&
      'peso' in exercise &&
      isValidWeight(exercise.peso),
  );
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value > 0;
}

function isAppBackupPayload(value: unknown): value is AppBackupPayload {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('format' in value) ||
    value.format !== 'evolift-backup' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('workouts' in value) ||
    !Array.isArray(value.workouts) ||
    !('completedByWorkout' in value) ||
    !isStoredWorkoutProgress(value.completedByWorkout)
  ) {
    return false;
  }

  const workoutIds = new Set<number>();
  return value.workouts.every((workout: unknown) => {
    if (
      typeof workout !== 'object' ||
      workout === null ||
      !('id' in workout) ||
      !isPositiveSafeInteger(workout.id) ||
      workoutIds.has(workout.id) ||
      !('nome' in workout) ||
      typeof workout.nome !== 'string' ||
      workout.nome.trim().length === 0 ||
      workout.nome.trim().length > 100 ||
      !('exercicios' in workout) ||
      !Array.isArray(workout.exercicios)
    ) {
      return false;
    }

    workoutIds.add(workout.id);
    return workout.exercicios.every(
      (exercise: unknown) =>
        typeof exercise === 'object' &&
        exercise !== null &&
        'exercicioId' in exercise &&
        isPositiveSafeInteger(exercise.exercicioId) &&
        exercicios.some((candidate) => candidate.id === exercise.exercicioId) &&
        'posicao' in exercise &&
        isPositiveSafeInteger(exercise.posicao) &&
        'quantidadeSeries' in exercise &&
        isPositiveSafeInteger(exercise.quantidadeSeries) &&
        'quantidadeExecucoes' in exercise &&
        isPositiveSafeInteger(exercise.quantidadeExecucoes) &&
        'peso' in exercise &&
        isValidWeight(exercise.peso),
    );
  });
}
