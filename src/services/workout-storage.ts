import AsyncStorage from '@react-native-async-storage/async-storage';

import { exercicios } from '@/constants/exercicios';

const WORKOUTS_KEY = 'evolift.workouts';

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
  const workouts = await listWorkouts();
  const workout = buildWorkout(input, nextWorkoutId(workouts));
  await saveWorkouts([...workouts, workout]);
  return workout;
}

export async function updateWorkout(workoutId: string, input: WorkoutInput): Promise<Workout> {
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
}

export async function updateWorkoutExerciseWeight(
  workoutId: string,
  exerciseIndex: number,
  peso: number | null,
): Promise<Workout> {
  if (!Number.isSafeInteger(exerciseIndex) || exerciseIndex < 0 || !isValidWeight(peso)) {
    throw new Error('O peso informado para o exercício é inválido.');
  }

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
}

function buildWorkout(input: WorkoutInput, id: number): Workout {
  return {
    id,
    nome: input.nome,
    exercicios: input.exercicios.map((item) => {
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
