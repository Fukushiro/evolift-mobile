import AsyncStorage from '@react-native-async-storage/async-storage';

import { exercicios } from '@/constants/exercicios';
import {
  createAppBackupCode,
  createWorkout,
  createWorkoutShareCode,
  deleteWorkout,
  getWorkout,
  importWorkoutFromCode,
  listWorkouts,
  restoreAppBackupFromCode,
  updateWorkout,
  updateWorkoutExerciseWeight,
  WORKOUT_PROGRESS_STORAGE_KEY,
} from './workout-storage';
import type { WorkoutInput } from './workout-storage';

const WORKOUTS_KEY = 'evolift.workouts';

jest.mock('@react-native-async-storage/async-storage', () => {
  const entries = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      __storage: entries,
      getItem: jest.fn(async (key: string) => entries.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        entries.set(key, value);
      }),
      multiSet: jest.fn(async (pairs: [string, string][]) => {
        pairs.forEach(([key, value]) => entries.set(key, value));
      }),
    },
  };
});

const mockStorage = (
  AsyncStorage as unknown as { __storage: Map<string, string> }
).__storage;

const validInput: WorkoutInput = {
  nome: ' Treino A ',
  exercicios: [
    {
      exercicioId: 1,
      posicao: 1,
      quantidadeSeries: 3,
      quantidadeExecucoes: 10,
      peso: 20.5,
    },
    {
      exercicioId: 2,
      posicao: 2,
      quantidadeSeries: 4,
      quantidadeExecucoes: 8,
      peso: null,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
});

describe('persistência de treinos', () => {
  it('lista vazio quando não há dados salvos', async () => {
    await expect(listWorkouts()).resolves.toEqual([]);
  });

  it('cria um treino com ID novo, nome normalizado e exercícios do catálogo', async () => {
    const workout = await createWorkout(validInput);

    expect(workout.id).toBe(1);
    expect(workout.nome).toBe('Treino A');
    expect(workout.exercicios[0].exercicio).toEqual(exercicios[0]);
    expect(await listWorkouts()).toEqual([workout]);
  });

  it('preserva IDs existentes ao criar e atualizar treinos', async () => {
    const created = await createWorkout(validInput);
    const updated = await updateWorkout(String(created.id), {
      ...validInput,
      nome: 'Treino atualizado',
    });
    const next = await createWorkout({ ...validInput, nome: 'Treino B' });

    expect(updated.id).toBe(created.id);
    expect(updated.nome).toBe('Treino atualizado');
    expect(next.id).toBe(created.id + 1);
  });

  it('rejeita edição de treino inexistente sem alterar os dados salvos', async () => {
    await createWorkout(validInput);

    await expect(updateWorkout('999', validInput)).rejects.toThrow(
      'O treino solicitado não foi encontrado.',
    );
    expect((await listWorkouts()).map(({ id }) => id)).toEqual([1]);
  });

  it('exclui somente o treino solicitado', async () => {
    await createWorkout(validInput);
    await createWorkout({ ...validInput, nome: 'Treino B' });

    await deleteWorkout('1');

    expect((await listWorkouts()).map(({ id, nome }) => ({ id, nome }))).toEqual([
      { id: 2, nome: 'Treino B' },
    ]);
  });

  it('rejeita exclusão de treino inexistente', async () => {
    await expect(deleteWorkout('999')).rejects.toThrow(
      'O treino solicitado não foi encontrado.',
    );
  });

  it('atualiza o peso do exercício correto sem alterar os outros', async () => {
    const workout = await createWorkout(validInput);

    const updated = await updateWorkoutExerciseWeight(String(workout.id), 1, 42.5);

    expect(updated.exercicios.map(({ peso }) => peso)).toEqual([20.5, 42.5]);
    expect((await getWorkout(String(workout.id))).exercicios[1].peso).toBe(42.5);
  });

  it('permite limpar o peso e rejeita peso inválido ou índice inexistente', async () => {
    const workout = await createWorkout(validInput);

    await updateWorkoutExerciseWeight(String(workout.id), 0, null);
    await expect(
      updateWorkoutExerciseWeight(String(workout.id), 0, -1),
    ).rejects.toThrow('O peso informado para o exercício é inválido.');
    await expect(
      updateWorkoutExerciseWeight(String(workout.id), 2, 10),
    ).rejects.toThrow('O exercício solicitado não foi encontrado neste treino.');
    expect((await getWorkout(String(workout.id))).exercicios[0].peso).toBeNull();
  });

  it('rejeita operações de peso em treino inexistente', async () => {
    await expect(updateWorkoutExerciseWeight('999', 0, 10)).rejects.toThrow(
      'O treino solicitado não foi encontrado.',
    );
  });

  it('retém em operações concorrentes todos os treinos com IDs distintos', async () => {
    const workouts = await Promise.all([
      createWorkout(validInput),
      createWorkout({ ...validInput, nome: 'Treino B' }),
      createWorkout({ ...validInput, nome: 'Treino C' }),
    ]);

    expect(workouts.map(({ id }) => id).sort()).toEqual([1, 2, 3]);
    expect((await listWorkouts()).map(({ nome }) => nome).sort()).toEqual([
      'Treino A',
      'Treino B',
      'Treino C',
    ]);
  });

  it.each([
    ['nome vazio', { ...validInput, nome: '   ' }],
    ['nome acima do limite', { ...validInput, nome: 'a'.repeat(101) }],
    ['sem exercícios', { ...validInput, exercicios: [] }],
    [
      'exercício desconhecido',
      { ...validInput, exercicios: [{ ...validInput.exercicios[0], exercicioId: 999 }] },
    ],
    [
      'séries inválidas',
      { ...validInput, exercicios: [{ ...validInput.exercicios[0], quantidadeSeries: 0 }] },
    ],
    [
      'repetições inválidas',
      { ...validInput, exercicios: [{ ...validInput.exercicios[0], quantidadeExecucoes: 1.5 }] },
    ],
    [
      'peso negativo',
      { ...validInput, exercicios: [{ ...validInput.exercicios[0], peso: -1 }] },
    ],
  ])('não salva treino quando contém %s', async (_label, input) => {
    await expect(createWorkout(input as WorkoutInput)).rejects.toThrow();
    expect(await listWorkouts()).toEqual([]);
  });

  it('migra pesos do formato antigo ao ler os treinos salvos', async () => {
    mockStorage.set(
      WORKOUTS_KEY,
      JSON.stringify([
        {
          id: 1,
          nome: 'Legado',
          exercicios: [
            {
              exercicioId: 1,
              posicao: 1,
              quantidadeSeries: 3,
              quantidadeExecucoes: 10,
              pesoMaximo: 60,
              exercicio: exercicios[0],
            },
          ],
        },
      ]),
    );

    const [workout] = await listWorkouts();

    expect(workout.exercicios[0].peso).toBe(60);
    expect(workout.exercicios[0]).not.toHaveProperty('pesoMaximo');
  });

  it('informa erro ao ler JSON ou estrutura local inválida', async () => {
    mockStorage.set(WORKOUTS_KEY, '{json');
    await expect(listWorkouts()).rejects.toThrow(SyntaxError);

    mockStorage.set(WORKOUTS_KEY, JSON.stringify([{ id: 'inválido' }]));
    await expect(listWorkouts()).rejects.toThrow(
      'Os treinos salvos localmente estão em um formato inválido.',
    );
  });

  it('propaga falhas de persistência na criação', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disco indisponível'));

    await expect(createWorkout(validInput)).rejects.toThrow('disco indisponível');
  });
});

describe('compartilhamento de treino', () => {
  it('exporta e importa um treino preservando configurações e pesos', async () => {
    const original = await createWorkout(validInput);
    const code = createWorkoutShareCode(original);
    mockStorage.clear();

    const imported = await importWorkoutFromCode(code);

    expect(imported.id).toBe(1);
    expect(imported.nome).toBe(original.nome);
    expect(imported.exercicios.map(({ exercicioId, posicao, quantidadeSeries, quantidadeExecucoes, peso }) => ({
      exercicioId,
      posicao,
      quantidadeSeries,
      quantidadeExecucoes,
      peso,
    }))).toEqual(validInput.exercicios);
  });

  it('cria um treino independente para cada importação repetida', async () => {
    const code = createWorkoutShareCode(await createWorkout(validInput));
    mockStorage.clear();

    await Promise.all([
      importWorkoutFromCode(code),
      importWorkoutFromCode(code),
    ]);

    expect((await listWorkouts()).map(({ id }) => id).sort()).toEqual([1, 2]);
  });

  it.each([
    ['vazio', ''],
    ['de outro formato', 'EVOLIFT-BACKUP:{}'],
    ['corrompido', 'EVOLIFT:{'],
    ['JSON incompleto', 'EVOLIFT:{"format":"evolift-workout","version":1}'],
  ])('rejeita código de treino %s sem gravar dados', async (_label, code) => {
    await expect(importWorkoutFromCode(code)).rejects.toThrow();
    expect(await listWorkouts()).toEqual([]);
  });

  it('rejeita exercício ausente do catálogo durante a importação', async () => {
    const code = `EVOLIFT:${JSON.stringify({
      format: 'evolift-workout',
      version: 1,
      workout: {
        nome: 'Treino externo',
        exercicios: [{ ...validInput.exercicios[0], exercicioId: 999 }],
      },
    })}`;

    await expect(importWorkoutFromCode(code)).rejects.toThrow(
      'O exercício 999 não existe no catálogo local.',
    );
    expect(await listWorkouts()).toEqual([]);
  });
});

describe('backup completo', () => {
  it('exporta todos os treinos e progresso no formato versionado', async () => {
    const workouts = [await createWorkout(validInput)];
    const progress = { 'local::1': { '1::1::0': 2 } };

    const code = createAppBackupCode(workouts, progress);

    expect(code.startsWith('EVOLIFT-BACKUP:')).toBe(true);
    expect(JSON.parse(code.slice('EVOLIFT-BACKUP:'.length))).toEqual({
      format: 'evolift-backup',
      version: 1,
      workouts: [
        {
          id: 1,
          nome: 'Treino A',
          exercicios: validInput.exercicios,
        },
      ],
      completedByWorkout: progress,
    });
  });

  it('restaura treinos e progresso e substitui todo o armazenamento anterior', async () => {
    await createWorkout(validInput);
    const progress = { 'local::7': { '2::2::0': 4 } };
    const code = createAppBackupCode(
      [{ id: 7, nome: 'Restaurado', exercicios: [
        { ...validInput.exercicios[1], exercicio: exercicios[1] },
      ] }],
      progress,
    );

    const restored = await restoreAppBackupFromCode(code);

    expect(restored.workouts[0].id).toBe(7);
    expect(restored.workouts[0].nome).toBe('Restaurado');
    expect(restored.workouts[0].exercicios[0].exercicio).toEqual(exercicios[1]);
    expect(restored.completedByWorkout).toEqual(progress);
    expect(await listWorkouts()).toEqual(restored.workouts);
    expect(mockStorage.get(WORKOUT_PROGRESS_STORAGE_KEY)).toBe(JSON.stringify(progress));
  });

  it('permite restaurar backup vazio', async () => {
    await createWorkout(validInput);
    const code = createAppBackupCode([], {});

    const restored = await restoreAppBackupFromCode(code);

    expect(restored).toEqual({ workouts: [], completedByWorkout: {} });
    expect(await listWorkouts()).toEqual([]);
  });

  it.each([
    ['código de treino', 'EVOLIFT:{}'],
    ['JSON corrompido', 'EVOLIFT-BACKUP:{'],
    [
      'versão incompatível',
      `EVOLIFT-BACKUP:${JSON.stringify({ format: 'evolift-backup', version: 99, workouts: [], completedByWorkout: {} })}`,
    ],
    [
      'contagem de séries inválida',
      `EVOLIFT-BACKUP:${JSON.stringify({
        format: 'evolift-backup',
        version: 1,
        workouts: [{
          id: 1,
          nome: 'Inválido',
          exercicios: [{ ...validInput.exercicios[0], quantidadeSeries: -1 }],
        }],
        completedByWorkout: {},
      })}`,
    ],
    [
      'progresso inválido',
      `EVOLIFT-BACKUP:${JSON.stringify({
        format: 'evolift-backup',
        version: 1,
        workouts: [],
        completedByWorkout: { 'local::1': { exercise: -1 } },
      })}`,
    ],
  ])('rejeita backup com %s sem substituir os dados', async (_label, code) => {
    await createWorkout(validInput);
    const existing = await listWorkouts();

    await expect(restoreAppBackupFromCode(code)).rejects.toThrow();

    expect(await listWorkouts()).toEqual(existing);
  });

  it('propaga falha ao persistir backup', async () => {
    const code = createAppBackupCode([], {});
    jest.mocked(AsyncStorage.multiSet).mockRejectedValueOnce(
      new Error('falha no armazenamento'),
    );

    await expect(restoreAppBackupFromCode(code)).rejects.toThrow(
      'falha no armazenamento',
    );
  });
});
