import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoutButton } from '@/components/logout-button';
import {
  createExercise,
  listExercises,
  updateExercise,
  type Exercise,
} from '@/services/auth-service';
import { useAppSelector } from '@/store/hooks';

type ExerciseFormScreenProps = {
  exerciseId?: string;
};

export function ExerciseFormScreen({ exerciseId }: ExerciseFormScreenProps) {
  const { isRestoring, session } = useAppSelector((state) => state.auth);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [name, setName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(exerciseId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const isEditing = Boolean(exerciseId);

  const loadExercise = useCallback(async () => {
    if (!session || session.user.role !== 'ADMIN' || !exerciseId) {
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const exercises = await listExercises(session);
      const foundExercise = exercises.find((item) => String(item.id) === exerciseId);
      if (!foundExercise) {
        setError('O exercício solicitado não foi encontrado.');
      } else {
        setExercise(foundExercise);
        setName(foundExercise.nome);
        setVideoUrl(foundExercise.videoUrl ?? '');
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o exercício.');
    } finally {
      setIsLoading(false);
    }
  }, [exerciseId, session]);

  useEffect(() => {
    if (!isRestoring && !session) {
      router.replace('/login');
    }
    if (session && session.user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [isRestoring, session]);

  useEffect(() => {
    if (exerciseId && session) {
      const frame = requestAnimationFrame(() => void loadExercise());
      return () => cancelAnimationFrame(frame);
    }
  }, [exerciseId, loadExercise, session]);

  async function submit() {
    if (!session) {
      return;
    }
    const cleanName = name.trim();
    const cleanVideoUrl = videoUrl.trim();
    setError('');
    if (!cleanName || cleanName.length > 100) {
      setError('Informe um nome válido para o exercício.');
      return;
    }
    if (
      cleanVideoUrl &&
      (cleanVideoUrl.length > 2048 ||
        !/^https?:\/\/\S+$/i.test(cleanVideoUrl))
    ) {
      setError('Informe uma URL de vídeo válida começando com http:// ou https://.');
      return;
    }

    setIsSaving(true);
    try {
      if (exercise) {
        await updateExercise(session, String(exercise.id), cleanName, cleanVideoUrl || null);
      } else {
        await createExercise(session, cleanName, cleanVideoUrl || undefined);
      }
      router.replace('/admin/exercicios');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o exercício.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <Text style={styles.brand}>evolift</Text>
            <LogoutButton />
          </View>
          <Text style={styles.eyebrow}>ÁREA ADMINISTRATIVA</Text>
          <Text style={styles.title}>{isEditing ? 'Editar exercício' : 'Novo exercício'}</Text>
          <Text style={styles.subtitle}>
            {isEditing ? 'Atualize as informações do exercício no catálogo.' : 'Adicione um exercício ao catálogo disponível para os treinos.'}
          </Text>

          {isRestoring || !session || session.user.role !== 'ADMIN' ? (
            <ActivityIndicator color="#659a3c" size="large" style={styles.loader} />
          ) : isLoading ? (
            <ActivityIndicator color="#659a3c" size="large" style={styles.loader} />
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.label}>Nome do exercício</Text>
              <TextInput
                autoCapitalize="sentences"
                maxLength={100}
                onChangeText={setName}
                placeholder="Ex.: Supino reto"
                placeholderTextColor="#89928a"
                style={styles.input}
                value={name}
              />
              <Text style={[styles.label, styles.videoLabel]}>URL do vídeo (opcional)</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                maxLength={2048}
                onChangeText={setVideoUrl}
                placeholder="https://..."
                placeholderTextColor="#89928a"
                style={styles.input}
                value={videoUrl}
              />
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}>
                <Pressable onPress={() => router.back()} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable disabled={isSaving} onPress={() => void submit()} style={[styles.saveButton, isSaving && styles.disabled]}>
                  {isSaving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.saveText}>{isEditing ? 'Salvar alterações' : 'Salvar exercício'}</Text>}
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f2' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  backText: { color: '#405545', fontSize: 36, lineHeight: 40 },
  brand: { color: '#183523', fontSize: 20, fontWeight: '800' },
  eyebrow: { color: '#719158', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#203528', fontSize: 31, fontWeight: '800', marginTop: 7 },
  subtitle: { color: '#778378', fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 23 },
  loader: { marginTop: 70 },
  formCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e6ebe3', padding: 18 },
  label: { color: '#334338', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  videoLabel: { marginTop: 19 },
  input: { height: 50, borderWidth: 1, borderColor: '#dfe6dc', borderRadius: 10, paddingHorizontal: 13, color: '#203327', backgroundColor: '#fbfcfa', fontSize: 14 },
  error: { color: '#b53e36', fontSize: 12, lineHeight: 18, marginTop: 13 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, borderTopWidth: 1, borderTopColor: '#e6ebe3', paddingTop: 17, marginTop: 24 },
  cancelButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1, borderColor: '#d7dfcd', borderRadius: 9 },
  cancelText: { color: '#465a3b', fontSize: 11, fontWeight: '700' },
  saveButton: { minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, backgroundColor: '#243329', borderRadius: 9 },
  saveText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
