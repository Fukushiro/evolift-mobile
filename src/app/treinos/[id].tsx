import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getWorkout, type Workout, type WorkoutExercise } from '@/services/workout-storage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  changeCompletedSets,
  clearWorkoutCompletedSets,
} from '@/store/workout-progress-slice';

function getExerciseIdentity(exercise: WorkoutExercise): string {
  return String(exercise.exercicioId);
}

function getExerciseKey(exercise: WorkoutExercise, index: number): string {
  return `${getExerciseIdentity(exercise)}::${exercise.posicao}::${index}`;
}

export default function WorkoutDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const workoutProgress = useAppSelector((state) => state.workoutProgress);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRestRunning, setIsRestRunning] = useState(false);
  const [videoError, setVideoError] = useState('');
  const accumulatedRestMs = useRef(0);
  const restStartedAt = useRef<number | null>(null);

  const loadWorkout = useCallback(async () => {
    if (!id) {
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      setWorkout(await getWorkout(id));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Não foi possível carregar este treino.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        return undefined;
      }
      const frame = requestAnimationFrame(() => {
        void loadWorkout();
      });
      return () => cancelAnimationFrame(frame);
    }, [id, loadWorkout]),
  );

  useEffect(() => {
    if (!isRestRunning) {
      return;
    }

    function updateElapsedTime() {
      const startedAt = restStartedAt.current;
      if (startedAt !== null) {
        setElapsedSeconds(Math.floor((accumulatedRestMs.current + Date.now() - startedAt) / 1000));
      }
    }

    const interval = setInterval(updateElapsedTime, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateElapsedTime();
      }
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [isRestRunning]);

  function toggleRestTimer() {
    if (isRestRunning) {
      const startedAt = restStartedAt.current;
      if (startedAt !== null) {
        accumulatedRestMs.current += Date.now() - startedAt;
        restStartedAt.current = null;
        setElapsedSeconds(Math.floor(accumulatedRestMs.current / 1000));
      }
      setIsRestRunning(false);
      return;
    }
    restStartedAt.current = Date.now();
    setIsRestRunning(true);
  }

  async function openVideo(videoUrl: string) {
    setVideoError('');
    try {
      await Linking.openURL(videoUrl);
    } catch {
      setVideoError('Não foi possível abrir o vídeo neste dispositivo.');
    }
  }

  if (workoutProgress.isRestoring) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#659a3c" size="large" />
      </View>
    );
  }

  const workoutKey = `local::${id}`;
  const completedSets = workoutProgress.completedByWorkout[workoutKey] ?? {};
  const exercises = workout?.exercicios ?? [];
  const hasCompletedSets = Object.values(completedSets).some((count) => count > 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.brand}>
            <View style={styles.brandMark}><Text style={styles.brandLetter}>E</Text></View>
            <Text style={styles.brandName}>evolift</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#659a3c" size="large" style={styles.loader} />
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.errorTitle}>Não foi possível abrir o treino</Text>
            <Text style={styles.description}>{error}</Text>
            <Pressable onPress={() => void loadWorkout()} style={styles.retryButton}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : workout ? (
          <>
            <View style={styles.topActions}>
              <Pressable
                onPress={() => router.push({ pathname: '/treinos/[id]/editar', params: { id } })}
                style={styles.editButton}
              >
                <Text style={styles.editText}>Editar treino</Text>
              </Pressable>
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow}>DETALHES DO TREINO</Text>
              <Text style={styles.title}>{workout.nome}</Text>
              <Text style={styles.subtitle}>
                {exercises.length} {exercises.length === 1 ? 'exercício' : 'exercícios'} · acompanhe suas séries
              </Text>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>SEU PROGRESSO</Text>
                <Text style={styles.sectionTitle}>Exercícios</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={!hasCompletedSets}
                onPress={() => dispatch(clearWorkoutCompletedSets(workoutKey))}
                style={({ pressed }) => [
                  styles.clearButton,
                  !hasCompletedSets && styles.clearButtonDisabled,
                  pressed && hasCompletedSets && styles.pressed,
                ]}
              >
                <Text style={[styles.clearText, !hasCompletedSets && styles.clearTextDisabled]}>
                  Limpar séries
                </Text>
              </Pressable>
            </View>

            <View style={styles.restCard}>
              <View>
                <Text style={styles.restLabel}>DESCANSO</Text>
                <Text style={styles.restTime}>
                  {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:
                  {String(elapsedSeconds % 60).padStart(2, '0')}
                </Text>
              </View>
              <View style={styles.restActions}>
                <Pressable onPress={toggleRestTimer} style={styles.restStartButton}>
                  <Text style={styles.restStartText}>
                    {isRestRunning ? 'Pausar' : elapsedSeconds > 0 ? 'Continuar' : 'Iniciar'}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={elapsedSeconds === 0 && !isRestRunning}
                  onPress={() => {
                    setIsRestRunning(false);
                    restStartedAt.current = null;
                    accumulatedRestMs.current = 0;
                    setElapsedSeconds(0);
                  }}
                  style={[styles.restResetButton, elapsedSeconds === 0 && !isRestRunning && styles.buttonDisabled]}
                >
                  <Text style={styles.restResetText}>Zerar</Text>
                </Pressable>
              </View>
            </View>

            {videoError ? <Text accessibilityRole="alert" style={styles.videoError}>{videoError}</Text> : null}
            {exercises.length ? (
              exercises.map((exercise, index) => {
                const exerciseKey = getExerciseKey(exercise, index);
                const totalSets = Math.max(0, Math.floor(exercise.quantidadeSeries ?? 0));
                const finishedSets = completedSets[exerciseKey] ?? 0;
                const name = exercise.exercicio.nome;
                const videoUrl = exercise.exercicio?.video;

                return (
                  <View key={`${exerciseKey}-${index}`} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeading}>
                      <View style={styles.exerciseNameRow}>
                        <Text style={styles.exerciseIndex}>{String(index + 1).padStart(2, '0')}</Text>
                        <Text style={styles.exerciseName}>{name}</Text>
                      </View>
                      <Text style={styles.exerciseDetails}>
                        {exercise.quantidadeSeries ?? '—'} séries × {exercise.quantidadeExecucoes ?? '—'} execuções
                      </Text>
                      {exercise.pesoMaximo !== null ? (
                        <Text style={styles.exerciseDetails}>Peso máximo: {exercise.pesoMaximo} kg</Text>
                      ) : null}
                    </View>
                    <View style={styles.seriesRow}>
                      <Text style={styles.seriesProgress}>
                        Séries realizadas: {finishedSets} / {totalSets || exercise.quantidadeSeries || 0}
                      </Text>
                      <View style={styles.seriesActions}>
                        <Pressable
                          accessibilityLabel={`Desmarcar uma série de ${name}`}
                          accessibilityRole="button"
                          disabled={finishedSets === 0}
                          onPress={() =>
                            dispatch(
                              changeCompletedSets({
                                workoutKey,
                                exerciseKey,
                                change: -1,
                                maximum: totalSets,
                              }),
                            )
                          }
                          style={({ pressed }) => [
                            styles.decrementButton,
                            finishedSets === 0 && styles.buttonDisabled,
                            pressed && finishedSets > 0 && styles.pressed,
                          ]}
                        >
                          <Text style={styles.decrementText}>−</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Marcar uma série de ${name} como realizada`}
                          accessibilityRole="button"
                          disabled={totalSets === 0 || finishedSets >= totalSets}
                          onPress={() =>
                            dispatch(
                              changeCompletedSets({
                                workoutKey,
                                exerciseKey,
                                change: 1,
                                maximum: totalSets,
                              }),
                            )
                          }
                          style={({ pressed }) => [
                            styles.markButton,
                            (totalSets === 0 || finishedSets >= totalSets) && styles.buttonDisabled,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.markText}>Marcar série</Text>
                        </Pressable>
                      </View>
                    </View>
                    {videoUrl ? (
                      <Pressable onPress={() => void openVideo(videoUrl)} style={styles.videoButton}>
                        <Text style={styles.videoButtonText}>▶  Assistir vídeo do exercício</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.noVideo}>Vídeo não cadastrado</Text>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Este treino ainda não possui exercícios.</Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f2' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7f2' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  backText: { color: '#405545', fontSize: 36, lineHeight: 40 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 31, height: 31, borderRadius: 10, backgroundColor: '#b9fa6a', alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: '#17311e', fontSize: 19, fontWeight: '900' },
  brandName: { color: '#183523', fontSize: 20, fontWeight: '800', letterSpacing: -1 },
  loader: { marginTop: 80 },
  topActions: { alignItems: 'flex-end', marginTop: 8 },
  editButton: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#243329', borderRadius: 9 },
  editText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  titleBlock: { marginTop: 22, marginBottom: 27 },
  eyebrow: { color: '#719158', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#203528', fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8, marginTop: 8 },
  subtitle: { color: '#778378', fontSize: 13, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  sectionEyebrow: { color: '#719158', fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  sectionTitle: { color: '#203528', fontSize: 21, fontWeight: '800', marginTop: 4 },
  restCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 15, borderWidth: 1, borderColor: '#dfe3da', backgroundColor: '#f0f3eb', borderRadius: 13, marginBottom: 13 },
  restLabel: { color: '#72796f', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  restTime: { color: '#27342a', fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 2 },
  restActions: { flexDirection: 'row', gap: 7 },
  restStartButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#243329', borderRadius: 8 },
  restStartText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  restResetButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d7dfcd', borderRadius: 8 },
  restResetText: { color: '#465a3b', fontSize: 10, fontWeight: '800' },
  videoError: { color: '#a33d32', fontSize: 12, marginBottom: 12 },
  clearButton: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 9, backgroundColor: '#eff6e8' },
  clearButtonDisabled: { backgroundColor: '#ecefe9' },
  clearText: { color: '#5d843e', fontSize: 11, fontWeight: '800' },
  clearTextDisabled: { color: '#a1aaa0' },
  exerciseCard: { backgroundColor: '#fff', borderRadius: 15, padding: 16, borderWidth: 1, borderColor: '#e6ebe3', marginBottom: 11 },
  exerciseHeading: { gap: 8 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  exerciseIndex: { color: '#80a55c', fontSize: 11, fontWeight: '800', paddingTop: 2 },
  exerciseName: { flex: 1, color: '#273a2c', fontSize: 15, lineHeight: 20, fontWeight: '800' },
  exerciseDetails: { color: '#778378', fontSize: 12, marginLeft: 27 },
  seriesRow: { borderTopWidth: 1, borderTopColor: '#eef0ea', marginTop: 13, paddingTop: 12, gap: 12 },
  seriesProgress: { color: '#465a3b', fontSize: 12, fontWeight: '700' },
  seriesActions: { flexDirection: 'row', gap: 8 },
  videoButton: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#eff6e8', borderRadius: 8, marginTop: 12 },
  videoButtonText: { color: '#587d3e', fontSize: 10, fontWeight: '800' },
  noVideo: { color: '#879187', fontSize: 10, marginTop: 12 },
  decrementButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d7dfcd', borderRadius: 9 },
  decrementText: { color: '#465a3b', fontSize: 22, lineHeight: 26 },
  markButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, backgroundColor: '#243329', borderRadius: 9 },
  markText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  buttonDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  emptyCard: { alignItems: 'center', padding: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6ebe3', borderRadius: 15 },
  emptyTitle: { color: '#2c3d30', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  errorTitle: { color: '#a83c34', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  description: { color: '#778378', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  retryButton: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#eff6e8', borderRadius: 9, marginTop: 16 },
  retryText: { color: '#5d843e', fontSize: 12, fontWeight: '800' },
});
