import { useLocalSearchParams } from 'expo-router';

import { ExerciseFormScreen } from '@/components/exercise-form-screen';

export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseFormScreen exerciseId={id} />;
}
