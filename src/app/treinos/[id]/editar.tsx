import { useLocalSearchParams } from 'expo-router';

import { WorkoutFormScreen } from '@/components/workout-form-screen';

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkoutFormScreen workoutId={id} />;
}
