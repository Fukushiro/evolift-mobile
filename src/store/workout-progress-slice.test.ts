import reducer, {
  changeCompletedSets,
  clearWorkoutCompletedSets,
  isStoredWorkoutProgress,
  restoreWorkoutProgress,
} from './workout-progress-slice';

describe('progresso de séries', () => {
  it('inicia sem progresso e aguardando restauração', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual({
      completedByWorkout: {},
      isRestoring: true,
    });
  });

  it('restaura progresso e encerra o estado de carregamento', () => {
    const progress = { 'local::1': { '1::1::0': 2 } };

    expect(reducer(undefined, restoreWorkoutProgress(progress))).toEqual({
      completedByWorkout: progress,
      isRestoring: false,
    });
  });

  it('incrementa progresso apenas para treino e exercício selecionados', () => {
    const state = reducer(
      undefined,
      changeCompletedSets({
        workoutKey: 'local::1',
        exerciseKey: '1::1::0',
        change: 1,
        maximum: 3,
      }),
    );

    expect(state.completedByWorkout).toEqual({
      'local::1': { '1::1::0': 1 },
    });
  });

  it('limita séries concluídas ao máximo configurado', () => {
    const initial = reducer(
      undefined,
      changeCompletedSets({
        workoutKey: 'local::1',
        exerciseKey: '1::1::0',
        change: 5,
        maximum: 3,
      }),
    );
    const state = reducer(
      initial,
      changeCompletedSets({
        workoutKey: 'local::1',
        exerciseKey: '1::1::0',
        change: 1,
        maximum: 3,
      }),
    );

    expect(state.completedByWorkout['local::1']['1::1::0']).toBe(3);
  });

  it('não permite que o progresso fique abaixo de zero', () => {
    const state = reducer(
      undefined,
      changeCompletedSets({
        workoutKey: 'local::1',
        exerciseKey: '1::1::0',
        change: -1,
        maximum: 3,
      }),
    );

    expect(state.completedByWorkout['local::1']['1::1::0']).toBe(0);
  });

  it('limpa o progresso de apenas um treino', () => {
    const initial = reducer(
      undefined,
      restoreWorkoutProgress({
        'local::1': { '1::1::0': 2 },
        'local::2': { '2::1::0': 1 },
      }),
    );

    const state = reducer(initial, clearWorkoutCompletedSets('local::1'));

    expect(state.completedByWorkout).toEqual({
      'local::1': {},
      'local::2': { '2::1::0': 1 },
    });
  });
});

describe('validação do progresso persistido', () => {
  it.each([
    ['objeto vazio', {}],
    ['progresso válido', { 'local::1': { exercise: 2 } }],
    ['vários treinos', { 'local::1': { a: 0 }, 'local::2': { b: 5 } }],
  ])('aceita %s', (_label, value) => {
    expect(isStoredWorkoutProgress(value)).toBe(true);
  });

  it.each([
    ['null', null],
    ['array', []],
    ['string', 'progress'],
    ['contagem negativa', { workout: { exercise: -1 } }],
    ['contagem fracionária', { workout: { exercise: 1.5 } }],
    ['contagem textual', { workout: { exercise: '2' } }],
    ['valor de treino como array', { workout: [] }],
  ])('rejeita %s', (_label, value) => {
    expect(isStoredWorkoutProgress(value)).toBe(false);
  });
});
