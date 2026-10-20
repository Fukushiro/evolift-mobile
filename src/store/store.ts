import { configureStore } from '@reduxjs/toolkit';

import workoutProgressReducer from './workout-progress-slice';

export const store = configureStore({
  reducer: {
    workoutProgress: workoutProgressReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
