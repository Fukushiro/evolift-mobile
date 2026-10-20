import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, type PropsWithChildren } from 'react';
import { Provider } from 'react-redux';

import {
  isStoredWorkoutProgress,
  restoreWorkoutProgress,
  type CompletedSetsByWorkout,
} from '@/store/workout-progress-slice';
import { store } from '@/store/store';

const WORKOUT_PROGRESS_KEY = 'evolift.workout-progress';

function LocalDataBootstrap({ children }: PropsWithChildren) {
  useEffect(() => {
    let isMounted = true;

    async function restoreSavedData() {
      let completedByWorkout: CompletedSetsByWorkout = {};
      try {
        const savedProgress = await AsyncStorage.getItem(WORKOUT_PROGRESS_KEY);
        if (savedProgress) {
          const parsed: unknown = JSON.parse(savedProgress);
          if (isStoredWorkoutProgress(parsed)) {
            completedByWorkout = parsed;
          } else {
            await AsyncStorage.removeItem(WORKOUT_PROGRESS_KEY);
          }
        }
      } catch (error) {
        console.error('Falha ao restaurar as séries dos treinos.', error);
      }

      if (isMounted) {
        store.dispatch(restoreWorkoutProgress(completedByWorkout));

        let previousProgress = store.getState().workoutProgress.completedByWorkout;
        let writeQueue = Promise.resolve();
        return store.subscribe(() => {
          const progress = store.getState().workoutProgress.completedByWorkout;
          if (progress === previousProgress) {
            return;
          }
          previousProgress = progress;
          const serializedProgress = JSON.stringify(progress);
          writeQueue = writeQueue
            .then(() => AsyncStorage.setItem(WORKOUT_PROGRESS_KEY, serializedProgress))
            .catch((error: unknown) => {
              console.error('Falha ao salvar as séries dos treinos.', error);
            });
        });
      }
      return undefined;
    }

    let unsubscribe: (() => void) | undefined;
    restoreSavedData().then((cleanup) => {
      unsubscribe = cleanup;
    }).catch((error: unknown) => {
      console.error('Falha ao restaurar os dados locais do Evolift.', error);
      if (isMounted) {
        store.dispatch(restoreWorkoutProgress({}));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  return children;
}

export function ReduxProvider({ children }: PropsWithChildren) {
  return (
    <Provider store={store}>
      <LocalDataBootstrap>{children}</LocalDataBootstrap>
    </Provider>
  );
}
