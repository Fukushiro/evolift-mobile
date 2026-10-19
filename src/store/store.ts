import { configureStore } from '@reduxjs/toolkit';

import authReducer from './auth-slice';
import workoutProgressReducer from './workout-progress-slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workoutProgress: workoutProgressReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
