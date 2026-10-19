import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/services/api';
import { listWorkouts, type Workout } from '@/services/auth-service';
import { persistSession } from '@/components/redux-provider';
import { clearSession } from '@/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const { isRestoring, session } = useAppSelector((state) => state.auth);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isRestoring && !session) {
      router.replace('/login');
    }
  }, [isRestoring, session]);

  const loadWorkouts = useCallback(async (refresh = false, initialLoad = false) => {
    if (!session || session.user.role === 'ADMIN') {
      return;
    }
    if (refresh) {
      setIsRefreshing(true);
    } else if (!initialLoad) {
      setIsLoading(true);
    }
    try {
      const loadedWorkouts = await listWorkouts(session);
      setWorkouts(
        [...loadedWorkouts].sort((left, right) =>
          left.nome.localeCompare(right.nome, 'pt-BR', { sensitivity: 'base', numeric: true }),
        ),
      );
      setError('');
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        await persistSession(null);
        dispatch(clearSession());
        router.replace('/login');
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar seus treinos.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dispatch, session]);

  useFocusEffect(
    useCallback(() => {
      if (!session || session.user.role === 'ADMIN') {
        return undefined;
      }
      const frame = requestAnimationFrame(() => {
        void loadWorkouts();
      });
      return () => cancelAnimationFrame(frame);
    }, [loadWorkouts, session]),
  );

  async function handleLogout() {
    await persistSession(null);
    dispatch(clearSession());
    router.replace('/login');
  }

  if (isRestoring || !session) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#6d9b46" size="large" />
      </View>
    );
  }

  const isAdmin = session.user.role === 'ADMIN';
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            onRefresh={() => loadWorkouts(true)}
            refreshing={isRefreshing}
            tintColor="#659a3c"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Text style={styles.brandLetter}>E</Text></View>
            <Text style={styles.brandName}>evolift</Text>
          </View>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.eyebrow}>{isAdmin ? 'ÁREA ADMINISTRATIVA' : 'SUA JORNADA CONTINUA'}</Text>
          <Text style={styles.welcomeTitle}>
            {isAdmin ? 'Bem-vindo,' : 'Bom ter você por aqui,'}{'\n'}
            <Text style={styles.userName}>{session.user.username}.</Text>
          </Text>
          <Text style={styles.welcomeDescription}>
            {isAdmin
              ? 'Acesse sua conta para acompanhar a plataforma Evolift.'
              : 'Um treino de cada vez. Seu próximo passo começa hoje.'}
          </Text>
          <View style={styles.progressLine}><View style={styles.progressFill} /></View>
          <Text style={styles.progressCaption}>EVOLUIR É UM HÁBITO</Text>
        </View>

        {isAdmin ? (
          <Pressable
            onPress={() => router.push('/admin/exercicios')}
            style={({ pressed }) => [styles.adminCard, pressed && styles.workoutPressed]}
          >
            <Text style={styles.sectionEyebrow}>GESTÃO</Text>
            <Text style={styles.sectionTitle}>Gerenciar exercícios</Text>
            <Text style={styles.emptyDescription}>Cadastre, atualize e remova exercícios do catálogo.</Text>
            <Text style={styles.adminAction}>Abrir gerenciamento  ›</Text>
          </Pressable>
        ) : (
          <View style={styles.workoutsSection}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>PLANEJAMENTO</Text>
                <Text style={styles.sectionTitle}>Seus treinos</Text>
              </View>
              <View style={styles.workoutsHeadingActions}>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{String(workouts.length).padStart(2, '0')} TREINOS</Text>
                </View>
                <Pressable onPress={() => router.push('/treinos/novo')} style={styles.createWorkoutButton}>
                  <Text style={styles.createWorkoutText}>+ Criar</Text>
                </Pressable>
              </View>
            </View>

            {isLoading ? (
              <ActivityIndicator color="#659a3c" style={styles.loader} />
            ) : error ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Não foi possível carregar</Text>
                <Text style={styles.emptyDescription}>{error}</Text>
                <Pressable onPress={() => loadWorkouts()} style={styles.retryButton}>
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : workouts.length ? (
              workouts.map((workout, index) => {
                const card = (
                  <>
                    <View style={styles.workoutTopRow}>
                      <Text style={styles.workoutIndex}>{String(index + 1).padStart(2, '0')}</Text>
                      <Text style={styles.workoutName}>{workout.nome}</Text>
                      {workout.id !== undefined && <Text style={styles.workoutArrow}>›</Text>}
                    </View>
                    {workout.exercicios?.length ? (
                      <View style={styles.exerciseList}>
                        {workout.exercicios.map((exercise, exerciseIndex) => (
                          <Text key={`${exercise.nome ?? exercise.exercicio?.nome ?? exerciseIndex}-${exerciseIndex}`} style={styles.exerciseItem}>
                            {exercise.exercicio?.nome ?? exercise.nome ?? 'Exercício'} · {exercise.quantidadeSeries ?? '—'} séries × {exercise.quantidadeExecucoes ?? '—'} execuções
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.workoutDetails}>
                        {workout.quantidadeSeries ?? '—'} séries  ·  {workout.quantidadeExecucoes ?? '—'} execuções
                      </Text>
                    )}
                  </>
                );
                const key = `${workout.id ?? workout.nome}-${index}`;
                return workout.id !== undefined ? (
                  <Pressable
                    accessibilityRole="button"
                    key={key}
                    onPress={() =>
                      router.push({
                        pathname: '/treinos/[id]',
                        params: { id: String(workout.id) },
                      })
                    }
                    style={({ pressed }) => [styles.workoutCard, pressed && styles.workoutPressed]}
                  >
                    {card}
                  </Pressable>
                ) : (
                  <View key={key} style={styles.workoutCard}>{card}</View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>+</Text></View>
                <Text style={styles.emptyTitle}>Seu espaço está pronto.</Text>
                <Text style={styles.emptyDescription}>Assim que seus treinos forem cadastrados, eles aparecerão aqui.</Text>
              </View>
            )}
          </View>
        )}
        <Text style={styles.footer}>© 2026 EVOLIFT · FEITO PARA IR MAIS LONGE</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f2' },
  loadingScreen: { flex: 1, backgroundColor: '#f5f7f2', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 33, height: 33, borderRadius: 11, backgroundColor: '#b9fa6a', alignItems: 'center', justifyContent: 'center' },
  brandLetter: { fontSize: 20, fontWeight: '900', color: '#17311e' },
  brandName: { color: '#183523', fontSize: 21, fontWeight: '800', letterSpacing: -1 },
  logoutButton: { paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1, borderColor: '#dfe6dc', borderRadius: 11 },
  logoutText: { color: '#536455', fontSize: 13, fontWeight: '700' },
  welcomeCard: { backgroundColor: '#183523', borderRadius: 22, padding: 22, marginTop: 12, overflow: 'hidden' },
  eyebrow: { color: '#b9fa6a', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  welcomeTitle: { color: '#f6f8f4', fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.7, marginTop: 14 },
  userName: { color: '#b9fa6a' },
  welcomeDescription: { color: '#c1cfc2', fontSize: 14, lineHeight: 21, marginTop: 10 },
  progressLine: { height: 3, backgroundColor: '#3b5541', marginTop: 26, borderRadius: 2 },
  progressFill: { height: 3, width: '32%', backgroundColor: '#b9fa6a', borderRadius: 2 },
  progressCaption: { color: '#92a694', fontSize: 9, fontWeight: '800', letterSpacing: 1.6, marginTop: 11 },
  workoutsSection: { marginTop: 30 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 },
  workoutsHeadingActions: { alignItems: 'flex-end', gap: 8 },
  sectionEyebrow: { color: '#719158', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  sectionTitle: { color: '#203528', fontSize: 23, fontWeight: '800', letterSpacing: -0.5, marginTop: 5 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#eaf0e5' },
  countText: { color: '#648049', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  createWorkoutButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: '#243329' },
  createWorkoutText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  workoutCard: { padding: 17, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e8ede5', marginBottom: 11 },
  workoutPressed: { opacity: 0.78 },
  workoutTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  workoutIndex: { color: '#80a55c', fontSize: 12, fontWeight: '800' },
  workoutName: { color: '#24392a', fontSize: 16, fontWeight: '800', flex: 1 },
  workoutArrow: { color: '#80a55c', fontSize: 27, lineHeight: 30 },
  workoutDetails: { color: '#778378', fontSize: 12, marginLeft: 33, marginTop: 9 },
  exerciseList: { marginLeft: 33, marginTop: 10, gap: 7 },
  exerciseItem: { color: '#778378', fontSize: 12, lineHeight: 18 },
  loader: { padding: 36 },
  emptyCard: { alignItems: 'center', paddingHorizontal: 22, paddingVertical: 29, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e8ede5' },
  emptyMark: { height: 42, width: 42, borderRadius: 14, backgroundColor: '#eff7e8', alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  emptyMarkText: { color: '#699344', fontSize: 27, fontWeight: '400', marginTop: -2 },
  emptyTitle: { color: '#2c3d30', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { color: '#7b867c', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  retryButton: { marginTop: 16, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9, backgroundColor: '#eef6e8' },
  retryText: { color: '#57803c', fontSize: 12, fontWeight: '800' },
  adminCard: { marginTop: 30, padding: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8ede5', borderRadius: 16 },
  adminAction: { color: '#5e853f', fontSize: 12, fontWeight: '800', marginTop: 15 },
  footer: { color: '#9aa399', fontSize: 9, letterSpacing: 1, textAlign: 'center', marginTop: 32 },
});
