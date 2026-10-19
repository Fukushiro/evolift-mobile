import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useEffect, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { Provider } from 'react-redux';

import { isStoredSession } from '@/services/auth-service';
import {
  isStoredWorkoutProgress,
  restoreWorkoutProgress,
  type CompletedSetsByWorkout,
} from '@/store/workout-progress-slice';
import { restoreSession } from '@/store/auth-slice';
import { store } from '@/store/store';

const SESSION_KEY = 'evolift.auth-session';
const WORKOUT_PROGRESS_KEY = 'evolift.workout-progress';

function SessionBootstrap({ children }: PropsWithChildren) {
  useEffect(() => {
    let isMounted = true;

    async function restoreSavedData() {
          let session = null;
          try {
            const saved = await getSavedSession();
            if (saved) {
              const parsed: unknown = JSON.parse(saved);
              if (isStoredSession(parsed)) {
                session = parsed;
              } else {
                await deleteSavedSession();
              }
            }
          } catch (error) {
            console.error('Falha ao restaurar a sessão do Evolift.', error);
          }

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
        store.dispatch(restoreSession(session));
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
      console.error('Falha ao restaurar a sessão do Evolift.', error);
      if (isMounted) {
        store.dispatch(restoreSession(null));
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

export async function persistSession(session: ReturnType<typeof store.getState>['auth']['session']) {
  if (!session) {
    await deleteSavedSession();
    return;
  }
  const serialized = JSON.stringify(session);
  if (Platform.OS === 'web') {
    window.localStorage.setItem(SESSION_KEY, serialized);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, serialized);
}

async function getSavedSession(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(SESSION_KEY);
  }
  return SecureStore.getItemAsync(SESSION_KEY);
}

async function deleteSavedSession(): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function ReduxProvider({ children }: PropsWithChildren) {
  return (
    <Provider store={store}>
      <SessionBootstrap>{children}</SessionBootstrap>
    </Provider>
  );
}
