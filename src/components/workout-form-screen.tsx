import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { exercicios } from '@/constants/exercicios';
import {
  createWorkout,
  getWorkout,
  updateWorkout,
  type Workout,
  type WorkoutInput,
} from '@/services/workout-storage';

type WorkoutFormScreenProps = {
  workoutId?: string;
};

type Selection = {
  key: string;
  exerciseId: string;
  sets: string;
  repetitions: string;
};

function selectionFromWorkout(workout: Workout): Selection[] {
  return [...(workout.exercicios ?? [])]
    .map((exercise, index) => ({ exercise, index }))
    .sort((left, right) => (left.exercise.posicao ?? left.index) - (right.exercise.posicao ?? right.index))
    .map(({ exercise, index }) => ({
      key: `existing-${index}`,
      exerciseId: String(exercise.exercicioId ?? exercise.exercicio?.id ?? ''),
      sets: String(exercise.quantidadeSeries ?? 3),
      repetitions: String(exercise.quantidadeExecucoes ?? 10),
    }));
}

function normalizeExerciseSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export function WorkoutFormScreen({ workoutId }: WorkoutFormScreenProps) {
  const [name, setName] = useState('');
  const exercises = exercicios;
  const [selections, setSelections] = useState<Selection[]>([
    { key: 'exercise-0', exerciseId: '', sets: '3', repetitions: '10' },
  ]);
  const [exercisePickerSelectionKey, setExercisePickerSelectionKey] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const isEditing = Boolean(workoutId);
  const searchTerms = normalizeExerciseSearch(exerciseSearch).trim().split(/\s+/).filter(Boolean);
  const filteredExercises = exercises.filter((exercise) => {
    const exerciseName = normalizeExerciseSearch(exercise.nome);
    return searchTerms.every((term) => exerciseName.includes(term));
  });

  const loadForm = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      const workout = workoutId ? await getWorkout(workoutId) : null;
      if (workout) {
        setName(workout.nome);
        setSelections(
          selectionFromWorkout(workout).length
            ? selectionFromWorkout(workout)
            : [{ key: 'exercise-0', exerciseId: '', sets: '3', repetitions: '10' }],
        );
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados do formulário.');
    } finally {
      setIsLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => void loadForm());
    return () => cancelAnimationFrame(frame);
  }, [loadForm]);

  function updateSelection(index: number, field: keyof Selection, value: string) {
    setSelections((current) =>
      current.map((selection, selectionIndex) =>
        selectionIndex === index ? { ...selection, [field]: value } : selection,
      ),
    );
  }

  function selectExercise(exerciseId: string) {
    if (exercisePickerSelectionKey === null) {
      return;
    }
    setSelections((current) =>
      current.map((selection) =>
        selection.key === exercisePickerSelectionKey ? { ...selection, exerciseId } : selection,
      ),
    );
    setExercisePickerSelectionKey(null);
    setExerciseSearch('');
  }

  function moveSelection(index: number, change: number) {
    const target = index + change;
    setSelections((current) => {
      if (target < 0 || target >= current.length) {
        return current;
      }
      const reordered = [...current];
      const [selection] = reordered.splice(index, 1);
      reordered.splice(target, 0, selection);
      return reordered;
    });
  }

  async function submit() {
    setError('');
    const workoutExercises = selections.map((selection, index) => ({
      exercicioId: Number(selection.exerciseId),
      posicao: index + 1,
      quantidadeSeries: Number(selection.sets),
      quantidadeExecucoes: Number(selection.repetitions),
    }));
    if (
      !name.trim() ||
      name.trim().length > 100 ||
      workoutExercises.length === 0 ||
      workoutExercises.some(
        (exercise) =>
          !Number.isSafeInteger(exercise.exercicioId) ||
          exercise.exercicioId <= 0 ||
          !Number.isSafeInteger(exercise.quantidadeSeries) ||
          exercise.quantidadeSeries <= 0 ||
          !Number.isSafeInteger(exercise.quantidadeExecucoes) ||
          exercise.quantidadeExecucoes <= 0,
      )
    ) {
      setError('Preencha o nome e selecione um exercício com séries e execuções válidas em cada item.');
      return;
    }
    setIsSaving(true);
    try {
      const input: WorkoutInput = {
        nome: name.trim(),
        exercicios: workoutExercises,
      };
      if (workoutId) {
        await updateWorkout(workoutId, input);
        router.replace({ pathname: '/treinos/[id]', params: { id: workoutId } });
      } else {
        await createWorkout(input);
        router.replace('/');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível salvar o treino.');
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
            <Text style={styles.headerTitle}>evolift</Text>
          </View>
          <Text style={styles.eyebrow}>PLANEJAMENTO</Text>
          <Text style={styles.title}>{isEditing ? 'Editar treino' : 'Novo treino'}</Text>
          <Text style={styles.subtitle}>
            {isEditing
              ? 'Atualize o nome, a ordem, os exercícios, as séries e as execuções.'
              : 'Escolha os exercícios e defina séries e execuções para cada um.'}
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#659a3c" size="large" style={styles.loader} />
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.label}>Nome do treino</Text>
              <TextInput
                maxLength={100}
                onChangeText={setName}
                placeholder="Ex.: Treino A"
                placeholderTextColor="#89928a"
                style={styles.input}
                value={name}
              />

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Exercícios do treino</Text>
                  <Text style={styles.helper}>
                    {selections.filter((selection) => selection.exerciseId).length} itens adicionados
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    setSelections((current) => [
                      ...current,
                      { key: `exercise-${Date.now()}-${current.length}`, exerciseId: '', sets: '3', repetitions: '10' },
                    ])
                  }
                  style={styles.addButton}
                >
                  <Text style={styles.addButtonText}>+ Adicionar</Text>
                </Pressable>
              </View>

              {exercises.length === 0 ? (
                <View style={styles.noticeCard}>
                  <Text style={styles.noticeText}>Nenhum exercício está disponível no catálogo local.</Text>
                  <Pressable onPress={() => void loadForm()}>
                    <Text style={styles.retryText}>Atualizar lista</Text>
                  </Pressable>
                </View>
              ) : null}

              {selections.map((selection, index) => (
                <View key={selection.key} style={styles.selectionCard}>
                  <View style={styles.selectionHeading}>
                    <View>
                      <Text style={styles.selectionTitle}>Exercício {String(index + 1).padStart(2, '0')}</Text>
                      <Text style={styles.helper}>Posição {index + 1}</Text>
                    </View>
                    <View style={styles.reorderButtons}>
                      <Pressable disabled={index === 0} onPress={() => moveSelection(index, -1)} style={[styles.reorderButton, index === 0 && styles.disabled]}>
                        <Text style={styles.reorderText}>↑</Text>
                      </Pressable>
                      <Pressable disabled={index === selections.length - 1} onPress={() => moveSelection(index, 1)} style={[styles.reorderButton, index === selections.length - 1 && styles.disabled]}>
                        <Text style={styles.reorderText}>↓</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.label}>Exercício</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      selection.exerciseId
                        ? `Exercício selecionado: ${exercises.find((exercise) => String(exercise.id) === selection.exerciseId)?.nome ?? 'não encontrado'}`
                        : 'Selecionar exercício'
                    }
                    onPress={() => {
                      setExerciseSearch('');
                      setExercisePickerSelectionKey(selection.key);
                    }}
                    style={styles.exerciseSelect}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.exerciseSelectText,
                        !selection.exerciseId && styles.exerciseSelectPlaceholder,
                      ]}
                    >
                      {exercises.find((exercise) => String(exercise.id) === selection.exerciseId)?.nome ??
                        'Selecione um exercício'}
                    </Text>
                    <Text style={styles.exerciseSelectChevron}>⌄</Text>
                  </Pressable>
                  <View style={styles.numberFields}>
                    <View style={styles.numberField}>
                      <Text style={styles.label}>Séries</Text>
                      <TextInput
                        keyboardType="number-pad"
                        onChangeText={(value) => updateSelection(index, 'sets', value)}
                        style={styles.input}
                        value={selection.sets}
                      />
                    </View>
                    <View style={styles.numberField}>
                      <Text style={styles.label}>Execuções</Text>
                      <TextInput
                        keyboardType="number-pad"
                        onChangeText={(value) => updateSelection(index, 'repetitions', value)}
                        style={styles.input}
                        value={selection.repetitions}
                      />
                    </View>
                  </View>
                  <Pressable
                    disabled={selections.length === 1}
                    onPress={() => setSelections((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    style={[styles.removeButton, selections.length === 1 && styles.disabled]}
                  >
                    <Text style={styles.removeText}>Remover exercício</Text>
                  </Pressable>
                </View>
              ))}

              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <Pressable
                disabled={isSaving || exercises.length === 0}
                onPress={() => void submit()}
                style={[styles.saveButton, (isSaving || exercises.length === 0) && styles.disabled]}
              >
                {isSaving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveText}>{isEditing ? 'Salvar alterações' : 'Criar treino'}</Text>}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        animationType="slide"
        onRequestClose={() => {
          setExercisePickerSelectionKey(null);
          setExerciseSearch('');
        }}
        transparent
        visible={exercisePickerSelectionKey !== null}
      >
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerPanel}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Selecionar exercício</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar seleção de exercícios"
                onPress={() => {
                  setExercisePickerSelectionKey(null);
                  setExerciseSearch('');
                }}
                style={styles.pickerCloseButton}
              >
                <Text style={styles.pickerCloseText}>×</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Buscar exercício"
              onChangeText={setExerciseSearch}
              placeholder="Buscar exercício"
              placeholderTextColor="#89928a"
              style={styles.pickerSearch}
              value={exerciseSearch}
            />
            <FlatList
              data={filteredExercises}
              keyExtractor={(exercise) => String(exercise.id)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.pickerEmpty}>
                  {exerciseSearch.trim()
                    ? 'Nenhum exercício encontrado.'
                    : 'Nenhum exercício disponível.'}
                </Text>
              }
              renderItem={({ item }) => {
                const selected = selections.find(
                  (selection) => selection.key === exercisePickerSelectionKey,
                )?.exerciseId === String(item.id);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => selectExercise(String(item.id))}
                    style={[styles.pickerOption, selected && styles.pickerOptionSelected]}
                  >
                    <Text
                      numberOfLines={2}
                      style={[styles.pickerOptionText, selected && styles.pickerOptionTextSelected]}
                    >
                      {item.nome}
                    </Text>
                    {selected ? <Text style={styles.pickerCheck}>✓</Text> : null}
                  </Pressable>
                );
              }}
              style={styles.pickerList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f2' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  backText: { color: '#405545', fontSize: 36, lineHeight: 40 },
  headerTitle: { color: '#183523', fontSize: 20, fontWeight: '800' },
  eyebrow: { color: '#719158', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#203528', fontSize: 32, fontWeight: '800', marginTop: 7 },
  subtitle: { color: '#778378', fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 23 },
  loader: { marginTop: 70 },
  formCard: { padding: 18, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e6ebe3' },
  label: { color: '#334338', fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#dfe6dc', borderRadius: 10, paddingHorizontal: 12, color: '#203327', backgroundColor: '#fbfcfa', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 25, marginBottom: 12 },
  sectionTitle: { color: '#273a2c', fontSize: 16, fontWeight: '800' },
  helper: { color: '#859086', fontSize: 11, marginTop: 4 },
  addButton: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#eef6e8', borderRadius: 9 },
  addButtonText: { color: '#5c853e', fontSize: 11, fontWeight: '800' },
  noticeCard: { padding: 13, backgroundColor: '#fbf5e9', borderRadius: 10, marginBottom: 14, gap: 8 },
  noticeText: { color: '#826c40', fontSize: 12, lineHeight: 18 },
  retryText: { color: '#5d843e', fontSize: 12, fontWeight: '800' },
  selectionCard: { padding: 13, backgroundColor: '#fbfcfa', borderWidth: 1, borderColor: '#e6ebe3', borderRadius: 12, marginBottom: 11 },
  selectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  selectionTitle: { color: '#273a2c', fontSize: 13, fontWeight: '800' },
  reorderButtons: { flexDirection: 'row', gap: 6 },
  reorderButton: { width: 32, height: 32, borderWidth: 1, borderColor: '#d7dfcd', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  reorderText: { color: '#465a3b', fontSize: 16, fontWeight: '700' },
  exerciseSelect: { minHeight: 48, borderWidth: 1, borderColor: '#dfe6dc', borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  exerciseSelectText: { flex: 1, color: '#203327', fontSize: 14, marginRight: 10 },
  exerciseSelectPlaceholder: { color: '#89928a' },
  exerciseSelectChevron: { color: '#59665a', fontSize: 20, lineHeight: 22 },
  pickerBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(17, 29, 20, 0.45)' },
  pickerPanel: { width: '100%', maxWidth: 520, height: '85%', maxHeight: 680, padding: 18, backgroundColor: '#fff', borderRadius: 16 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  pickerTitle: { color: '#273a2c', fontSize: 18, fontWeight: '800' },
  pickerCloseButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#f1f4ef' },
  pickerCloseText: { color: '#465a3b', fontSize: 26, lineHeight: 30 },
  pickerSearch: { minHeight: 48, borderWidth: 1, borderColor: '#dfe6dc', borderRadius: 10, paddingHorizontal: 12, marginBottom: 10, color: '#203327', backgroundColor: '#fbfcfa', fontSize: 14 },
  pickerList: { flex: 1 },
  pickerOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#edf0eb' },
  pickerOptionSelected: { backgroundColor: '#eff7e8' },
  pickerOptionText: { flex: 1, color: '#465449', fontSize: 14 },
  pickerOptionTextSelected: { color: '#456f2d', fontWeight: '800' },
  pickerCheck: { marginLeft: 12, color: '#5c853e', fontSize: 18, fontWeight: '800' },
  pickerEmpty: { paddingVertical: 24, color: '#778378', fontSize: 13, textAlign: 'center' },
  numberFields: { flexDirection: 'row', gap: 10 },
  numberField: { flex: 1 },
  removeButton: { alignSelf: 'flex-end', paddingVertical: 9, paddingHorizontal: 3 },
  removeText: { color: '#a24f44', fontSize: 11, fontWeight: '700' },
  error: { color: '#b53e36', fontSize: 12, lineHeight: 18, marginTop: 8 },
  saveButton: { height: 52, backgroundColor: '#243329', borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.45 },
});
