import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createAppBackupCode,
  importWorkoutFromCode,
  listWorkouts,
  restoreAppBackupFromCode,
  type Workout,
} from '@/services/workout-storage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { restoreWorkoutProgress } from '@/store/workout-progress-slice';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const workoutProgress = useAppSelector((state) => state.workoutProgress);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [workoutCode, setWorkoutCode] = useState('');
  const [importError, setImportError] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [backupError, setBackupError] = useState('');
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [backupImportCode, setBackupImportCode] = useState('');
  const [backupImportError, setBackupImportError] = useState('');
  const [backupImportStatus, setBackupImportStatus] = useState('');
  const [isConfirmingBackupImport, setIsConfirmingBackupImport] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  const loadWorkouts = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');
    try {
      const savedWorkouts = await listWorkouts();
      setWorkouts(
        [...savedWorkouts].sort((left, right) =>
          left.nome.localeCompare(right.nome, 'pt-BR', { sensitivity: 'base', numeric: true }),
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar seus treinos.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(() => void loadWorkouts());
      return () => cancelAnimationFrame(frame);
    }, [loadWorkouts]),
  );

  async function importWorkout() {
    setImportError('');
    setImportStatus('');
    if (!workoutCode.trim()) {
      setImportError('Cole o código do treino antes de importar.');
      return;
    }

    setIsImporting(true);
    try {
      const workout = await importWorkoutFromCode(workoutCode);
      setWorkoutCode('');
      setImportStatus(`Treino "${workout.nome}" importado com sucesso.`);
      await loadWorkouts(true);
    } catch (importFailure) {
      setImportError(
        importFailure instanceof Error
          ? importFailure.message
          : 'Não foi possível importar o treino.',
      );
    } finally {
      setIsImporting(false);
    }
  }

  async function exportAppBackup() {
    setBackupStatus('');
    setBackupError('');
    setIsExportingBackup(true);
    try {
      const savedWorkouts = await listWorkouts();
      const backupCode = createAppBackupCode(
        savedWorkouts,
        workoutProgress.completedByWorkout,
      );
      await Clipboard.setStringAsync(backupCode);
      setBackupStatus(
        `Backup de ${savedWorkouts.length} ${savedWorkouts.length === 1 ? 'treino copiado' : 'treinos copiados'} com o progresso das séries.`,
      );
    } catch (backupFailure) {
      setBackupError(
        backupFailure instanceof Error
          ? backupFailure.message
          : 'Não foi possível exportar os dados do app.',
      );
    } finally {
      setIsExportingBackup(false);
    }
  }

  async function restoreAppBackup() {
    setBackupImportError('');
    setBackupImportStatus('');
    setIsRestoringBackup(true);
    try {
      const restored = await restoreAppBackupFromCode(backupImportCode);
      dispatch(restoreWorkoutProgress(restored.completedByWorkout));
      setBackupImportCode('');
      setIsConfirmingBackupImport(false);
      setBackupImportStatus(
        `Backup restaurado: ${restored.workouts.length} ${restored.workouts.length === 1 ? 'treino importado' : 'treinos importados'} e progresso das séries recuperado.`,
      );
      await loadWorkouts(true);
    } catch (restoreFailure) {
      setBackupImportError(
        restoreFailure instanceof Error
          ? restoreFailure.message
          : 'Não foi possível restaurar o backup.',
      );
    } finally {
      setIsRestoringBackup(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            onRefresh={() => void loadWorkouts(true)}
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
          <Pressable onPress={() => router.push('/treinos/novo')} style={styles.createWorkoutButton}>
            <Text style={styles.createWorkoutText}>+ Criar treino</Text>
          </Pressable>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.eyebrow}>SUA ROTINA. SEU RITMO.</Text>
          <Text style={styles.welcomeTitle}>Evolua um treino{'\n'}de cada vez.</Text>
          <Text style={styles.welcomeDescription}>
            Seus treinos ficam salvos neste dispositivo e estão disponíveis mesmo sem internet.
          </Text>
          <View style={styles.progressLine}><View style={styles.progressFill} /></View>
          <Text style={styles.progressCaption}>EVOLUIR É UM HÁBITO</Text>
        </View>

        <View style={styles.backupCard}>
          <View style={styles.backupCopy}>
            <Text style={styles.backupTitle}>Backup dos dados do app</Text>
            <Text style={styles.backupDescription}>
              Exporte ou restaure todos os treinos e o progresso das séries.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isExportingBackup || workoutProgress.isRestoring}
            onPress={() => void exportAppBackup()}
            style={[
              styles.backupButton,
              (isExportingBackup ||
                isRestoringBackup ||
                workoutProgress.isRestoring) &&
                styles.importButtonDisabled,
            ]}
          >
            <Text style={styles.backupButtonText}>
              {isExportingBackup ? 'Exportando...' : 'Exportar todos os dados'}
            </Text>
          </Pressable>
          <TextInput
            accessibilityLabel="Código de backup completo para importar"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isRestoringBackup}
            multiline
            onChangeText={(value) => {
              setBackupImportCode(value);
              setBackupImportError('');
              setBackupImportStatus('');
            }}
            placeholder="Cole o código exportado do app"
            placeholderTextColor="#89928a"
            style={styles.importInput}
            textAlignVertical="top"
            value={backupImportCode}
          />
          <Pressable
            accessibilityRole="button"
            disabled={
              isRestoringBackup ||
              workoutProgress.isRestoring ||
              !backupImportCode.trim()
            }
            onPress={() => {
              setBackupImportError('');
              setIsConfirmingBackupImport(true);
            }}
            style={[
              styles.backupImportButton,
              (isRestoringBackup ||
                workoutProgress.isRestoring ||
                !backupImportCode.trim()) &&
                styles.importButtonDisabled,
            ]}
          >
            <Text style={styles.backupImportButtonText}>
              {isRestoringBackup ? 'Restaurando...' : 'Importar backup completo'}
            </Text>
          </Pressable>
          {backupError ? (
            <Text accessibilityRole="alert" style={styles.importError}>
              {backupError}
            </Text>
          ) : null}
          {backupStatus ? <Text style={styles.importStatus}>{backupStatus}</Text> : null}
          {backupImportError ? (
            <Text accessibilityRole="alert" style={styles.importError}>
              {backupImportError}
            </Text>
          ) : null}
          {backupImportStatus ? (
            <Text style={styles.importStatus}>{backupImportStatus}</Text>
          ) : null}
        </View>

        <View style={styles.workoutsSection}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>PLANEJAMENTO</Text>
              <Text style={styles.sectionTitle}>Seus treinos</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{String(workouts.length).padStart(2, '0')} TREINOS</Text>
            </View>
          </View>

          <View style={styles.importCard}>
            <Text style={styles.importTitle}>Importar treino</Text>
            <Text style={styles.importDescription}>
              Cole aqui o código compartilhado de outro treino.
            </Text>
            <TextInput
              accessibilityLabel="Código do treino para importar"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isImporting}
              multiline
              onChangeText={(value) => {
                setWorkoutCode(value);
                setImportError('');
                setImportStatus('');
              }}
              placeholder="Cole o código do treino"
              placeholderTextColor="#89928a"
              style={styles.importInput}
              textAlignVertical="top"
              value={workoutCode}
            />
            <Pressable
              accessibilityRole="button"
              disabled={isImporting}
              onPress={() => void importWorkout()}
              style={[styles.importButton, isImporting && styles.importButtonDisabled]}
            >
              <Text style={styles.importButtonText}>
                {isImporting ? 'Importando...' : 'Importar treino'}
              </Text>
            </Pressable>
            {importError ? (
              <Text accessibilityRole="alert" style={styles.importError}>
                {importError}
              </Text>
            ) : null}
            {importStatus ? <Text style={styles.importStatus}>{importStatus}</Text> : null}
          </View>

          {isLoading ? (
            <ActivityIndicator color="#659a3c" style={styles.loader} />
          ) : error ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Não foi possível carregar</Text>
              <Text style={styles.emptyDescription}>{error}</Text>
              <Pressable onPress={() => void loadWorkouts()} style={styles.retryButton}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : workouts.length ? (
            workouts.map((workout, index) => (
              <Pressable
                accessibilityRole="button"
                key={workout.id}
                onPress={() =>
                  router.push({
                    pathname: '/treinos/[id]',
                    params: { id: String(workout.id) },
                  })
                }
                style={({ pressed }) => [styles.workoutCard, pressed && styles.workoutPressed]}
              >
                <View style={styles.workoutTopRow}>
                  <Text style={styles.workoutIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={styles.workoutName}>{workout.nome}</Text>
                  <Text style={styles.workoutArrow}>›</Text>
                </View>
                <View style={styles.exerciseList}>
                  {workout.exercicios.map((exercise, exerciseIndex) => (
                    <Text key={`${exercise.exercicioId}-${exerciseIndex}`} style={styles.exerciseItem}>
                      {exercise.exercicio.nome} · {exercise.quantidadeSeries} séries × {exercise.quantidadeExecucoes} execuções
                      {exercise.peso !== null ? ` · ${exercise.peso} kg` : ''}
                    </Text>
                  ))}
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>+</Text></View>
              <Text style={styles.emptyTitle}>Seu espaço está pronto.</Text>
              <Text style={styles.emptyDescription}>Crie seu primeiro treino para começar.</Text>
              <Pressable onPress={() => router.push('/treinos/novo')} style={styles.retryButton}>
                <Text style={styles.retryText}>Criar treino</Text>
              </Pressable>
            </View>
          )}
        </View>
        <Text style={styles.footer}>© 2026 EVOLIFT · FEITO PARA IR MAIS LONGE</Text>
      </ScrollView>
      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!isRestoringBackup) {
            setIsConfirmingBackupImport(false);
          }
        }}
        transparent
        visible={isConfirmingBackupImport}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Substituir dados do app?</Text>
            <Text style={styles.confirmDescription}>
              A importação substituirá todos os treinos e o progresso salvos neste
              dispositivo. Essa ação não pode ser desfeita.
            </Text>
            {backupImportError ? (
              <Text accessibilityRole="alert" style={styles.importError}>
                {backupImportError}
              </Text>
            ) : null}
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isRestoringBackup}
                onPress={() => {
                  setIsConfirmingBackupImport(false);
                  setBackupImportError('');
                }}
                style={[styles.confirmCancelButton, isRestoringBackup && styles.importButtonDisabled]}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isRestoringBackup}
                onPress={() => void restoreAppBackup()}
                style={[styles.confirmRestoreButton, isRestoringBackup && styles.importButtonDisabled]}
              >
                <Text style={styles.confirmRestoreText}>
                  {isRestoringBackup ? 'Restaurando...' : 'Substituir e importar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f2' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 33, height: 33, borderRadius: 11, backgroundColor: '#b9fa6a', alignItems: 'center', justifyContent: 'center' },
  brandLetter: { fontSize: 20, fontWeight: '900', color: '#17311e' },
  brandName: { color: '#183523', fontSize: 21, fontWeight: '800', letterSpacing: -1 },
  welcomeCard: { backgroundColor: '#183523', borderRadius: 22, padding: 22, marginTop: 12, overflow: 'hidden' },
  eyebrow: { color: '#b9fa6a', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  welcomeTitle: { color: '#f6f8f4', fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.7, marginTop: 14 },
  welcomeDescription: { color: '#c1cfc2', fontSize: 14, lineHeight: 21, marginTop: 10 },
  progressLine: { height: 3, backgroundColor: '#3b5541', marginTop: 26, borderRadius: 2 },
  progressFill: { height: 3, width: '32%', backgroundColor: '#b9fa6a', borderRadius: 2 },
  progressCaption: { color: '#92a694', fontSize: 9, fontWeight: '800', letterSpacing: 1.6, marginTop: 11 },
  backupCard: { padding: 15, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e8ede5', marginTop: 14 },
  backupCopy: { gap: 5 },
  backupTitle: { color: '#24392a', fontSize: 14, fontWeight: '800' },
  backupDescription: { color: '#778378', fontSize: 12, lineHeight: 18 },
  backupButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#243329', borderRadius: 9, marginTop: 11 },
  backupButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  backupImportButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6e8', borderRadius: 9, marginTop: 9 },
  backupImportButtonText: { color: '#587d3e', fontSize: 12, fontWeight: '800' },
  confirmBackdrop: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  confirmCard: { padding: 20, backgroundColor: '#fff', borderRadius: 16 },
  confirmTitle: { color: '#24392a', fontSize: 18, fontWeight: '800' },
  confirmDescription: { color: '#667367', fontSize: 13, lineHeight: 20, marginTop: 10 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  confirmCancelButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 13, backgroundColor: '#f0f3eb', borderRadius: 9 },
  confirmCancelText: { color: '#465a3b', fontSize: 12, fontWeight: '800' },
  confirmRestoreButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 13, backgroundColor: '#c93636', borderRadius: 9 },
  confirmRestoreText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  workoutsSection: { marginTop: 30 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 },
  sectionEyebrow: { color: '#719158', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  sectionTitle: { color: '#203528', fontSize: 23, fontWeight: '800', letterSpacing: -0.5, marginTop: 5 },
  importCard: { padding: 15, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e8ede5', marginBottom: 16 },
  importTitle: { color: '#24392a', fontSize: 14, fontWeight: '800' },
  importDescription: { color: '#778378', fontSize: 12, lineHeight: 18, marginTop: 5 },
  importInput: { minHeight: 76, maxHeight: 140, padding: 11, backgroundColor: '#f8faf6', borderWidth: 1, borderColor: '#dfe5da', borderRadius: 9, color: '#273a2c', fontSize: 12, marginTop: 11 },
  importButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#243329', borderRadius: 9, marginTop: 10 },
  importButtonDisabled: { opacity: 0.6 },
  importButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  importError: { color: '#a33d32', fontSize: 12, marginTop: 9 },
  importStatus: { color: '#587d3e', fontSize: 12, marginTop: 9 },
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
  footer: { color: '#9aa399', fontSize: 9, letterSpacing: 1, textAlign: 'center', marginTop: 32 },
});
