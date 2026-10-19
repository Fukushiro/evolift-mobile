import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoutButton } from '@/components/logout-button';
import { deleteExercise, listExercises, type Exercise } from '@/services/auth-service';
import { useAppSelector } from '@/store/hooks';

const PAGE_SIZE = 10;

export function ExerciseManagerScreen() {
  const { isRestoring, session } = useAppSelector((state) => state.auth);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadExercises = useCallback(async (refresh = false) => {
    if (!session) {
      return;
    }
    setError('');
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      setExercises(await listExercises(session));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os exercícios.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    if (!isRestoring && !session) {
      router.replace('/login');
    }
    if (session && session.user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [isRestoring, session]);

  useFocusEffect(
    useCallback(() => {
      if (!session || session.user.role !== 'ADMIN') {
        return undefined;
      }
      const frame = requestAnimationFrame(() => void loadExercises());
      return () => cancelAnimationFrame(frame);
    }, [loadExercises, session]),
  );

  async function removeExercise(exercise: Exercise) {
    if (!session) {
      return;
    }
    setDeletingId(String(exercise.id));
    setError('');
    setNotice('');
    try {
      await deleteExercise(session, String(exercise.id));
      setExercises((current) => {
        const next = current.filter((item) => String(item.id) !== String(exercise.id));
        setPage((currentPage) => Math.min(currentPage, Math.max(1, Math.ceil(next.length / PAGE_SIZE))));
        return next;
      });
      setNotice('Exercício removido com sucesso.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível remover o exercício.');
    } finally {
      setDeletingId(null);
    }
  }

  function confirmDelete(exercise: Exercise) {
    Alert.alert(
      'Excluir exercício?',
      `“${exercise.nome}” será removido do catálogo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => void removeExercise(exercise) },
      ],
    );
  }

  const totalPages = Math.max(1, Math.ceil(exercises.length / PAGE_SIZE));
  const visibleExercises = exercises.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void loadExercises(true)} refreshing={isRefreshing} tintColor="#659a3c" />}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.brand}>evolift</Text>
          <LogoutButton />
        </View>
        <Text style={styles.eyebrow}>ÁREA ADMINISTRATIVA</Text>
        <Text style={styles.title}>Gerenciar exercícios</Text>
        <Text style={styles.subtitle}>Cadastre, atualize e remova exercícios do catálogo.</Text>

        <View style={styles.toolbar}>
          <Text style={styles.count}>
            {exercises.length} {exercises.length === 1 ? 'exercício cadastrado' : 'exercícios cadastrados'}
          </Text>
          <Pressable onPress={() => router.push('/admin/exercicios/novo')} style={styles.addButton}>
            <Text style={styles.addText}>+ Novo exercício</Text>
          </Pressable>
        </View>

        {isRestoring || !session || session.user.role !== 'ADMIN' ? (
          <ActivityIndicator color="#659a3c" size="large" style={styles.loader} />
        ) : error ? (
          <View style={styles.messageCard}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => void loadExercises()}><Text style={styles.retry}>Tentar novamente</Text></Pressable>
          </View>
        ) : null}
        {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}

        {isLoading ? (
          <ActivityIndicator color="#659a3c" size="large" style={styles.loader} />
        ) : visibleExercises.length ? (
          visibleExercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseDescription}>
                <Text style={styles.exerciseName}>{exercise.nome}</Text>
                {exercise.videoUrl ? <Text numberOfLines={1} style={styles.videoHint}>Vídeo cadastrado</Text> : null}
              </View>
              <View style={styles.exerciseActions}>
                <Pressable
                  onPress={() => router.push({
                    pathname: '/admin/exercicios/[id]/editar',
                    params: { id: String(exercise.id) },
                  })}
                  style={styles.editButton}
                >
                  <Text style={styles.editText}>Editar</Text>
                </Pressable>
                <Pressable
                  disabled={deletingId !== null}
                  onPress={() => confirmDelete(exercise)}
                  style={[styles.deleteButton, deletingId !== null && styles.disabled]}
                >
                  {deletingId === String(exercise.id)
                    ? <ActivityIndicator color="#9b4a40" size="small" />
                    : <Text style={styles.deleteText}>Excluir</Text>}
                </Pressable>
              </View>
            </View>
          ))
        ) : !error ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>Nenhum exercício cadastrado.</Text></View>
        ) : null}

        {!isLoading && exercises.length > 0 ? (
          <View style={styles.pagination}>
            <Text style={styles.paginationCount}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, exercises.length)} de {exercises.length}
            </Text>
            <View style={styles.paginationActions}>
              <Pressable disabled={page <= 1} onPress={() => setPage((current) => current - 1)} style={[styles.pageButton, page <= 1 && styles.disabled]}>
                <Text style={styles.pageText}>Anterior</Text>
              </Pressable>
              <Text style={styles.pageCount}>{page}/{totalPages}</Text>
              <Pressable disabled={page >= totalPages} onPress={() => setPage((current) => current + 1)} style={[styles.pageButton, page >= totalPages && styles.disabled]}>
                <Text style={styles.pageText}>Próxima</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f2' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  backText: { color: '#405545', fontSize: 36, lineHeight: 40 },
  brand: { color: '#183523', fontSize: 20, fontWeight: '800' },
  eyebrow: { color: '#719158', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#203528', fontSize: 29, fontWeight: '800', marginTop: 7 },
  subtitle: { color: '#778378', fontSize: 13, lineHeight: 19, marginTop: 7 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 23, marginBottom: 14 },
  count: { color: '#778378', flex: 1, fontSize: 11 },
  addButton: { paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#243329', borderRadius: 9 },
  addText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  messageCard: { padding: 14, backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, gap: 10 },
  error: { color: '#a33d32', fontSize: 12, lineHeight: 18 },
  retry: { color: '#5d843e', fontSize: 12, fontWeight: '800' },
  notice: { color: '#536d40', fontSize: 12, marginBottom: 12 },
  loader: { padding: 40 },
  exerciseCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6ebe3', borderRadius: 12, marginBottom: 9 },
  exerciseDescription: { flex: 1, gap: 5 },
  exerciseName: { color: '#273a2c', fontSize: 13, fontWeight: '800' },
  videoHint: { color: '#879187', fontSize: 10 },
  exerciseActions: { flexDirection: 'row', gap: 7 },
  editButton: { paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderColor: '#d7dfcd', borderRadius: 8 },
  editText: { color: '#465a3b', fontSize: 10, fontWeight: '700' },
  deleteButton: { minWidth: 58, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9, paddingVertical: 9, borderWidth: 1, borderColor: '#ead5d1', borderRadius: 8 },
  deleteText: { color: '#9b4a40', fontSize: 10, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  emptyCard: { padding: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6ebe3', borderRadius: 12, alignItems: 'center' },
  emptyText: { color: '#778378', fontSize: 13 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: 13, marginTop: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6ebe3', borderRadius: 12 },
  paginationCount: { color: '#778378', fontSize: 11 },
  paginationActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageButton: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#d7dfcd', borderRadius: 8 },
  pageText: { color: '#465a3b', fontSize: 10, fontWeight: '700' },
  pageCount: { color: '#778378', fontSize: 10 },
});
