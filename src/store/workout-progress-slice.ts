import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type CompletedSetsByWorkout = Record<string, Record<string, number>>;

type WorkoutProgressState = {
  completedByWorkout: CompletedSetsByWorkout;
  isRestoring: boolean;
};

const initialState: WorkoutProgressState = {
  completedByWorkout: {},
  isRestoring: true,
};

const workoutProgressSlice = createSlice({
  name: 'workoutProgress',
  initialState,
  reducers: {
    restoreWorkoutProgress(state, action: PayloadAction<CompletedSetsByWorkout>) {
      state.completedByWorkout = action.payload;
      state.isRestoring = false;
    },
    changeCompletedSets(
      state,
      action: PayloadAction<{
        workoutKey: string;
        exerciseKey: string;
        change: number;
        maximum: number;
      }>,
    ) {
      const { workoutKey, exerciseKey, change, maximum } = action.payload;
      const workoutProgress = (state.completedByWorkout[workoutKey] ??= {});
      workoutProgress[exerciseKey] = Math.min(
        maximum,
        Math.max(0, (workoutProgress[exerciseKey] ?? 0) + change),
      );
    },
    clearWorkoutCompletedSets(state, action: PayloadAction<string>) {
      state.completedByWorkout[action.payload] = {};
    },
  },
});

export const {
  changeCompletedSets,
  clearWorkoutCompletedSets,
  restoreWorkoutProgress,
} = workoutProgressSlice.actions;
export default workoutProgressSlice.reducer;

export function isStoredWorkoutProgress(
  value: unknown,
): value is CompletedSetsByWorkout {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((workout) => {
    if (typeof workout !== 'object' || workout === null || Array.isArray(workout)) {
      return false;
    }
    return Object.values(workout).every(
      (count) => typeof count === 'number' && Number.isInteger(count) && count >= 0,
    );
  });
}
