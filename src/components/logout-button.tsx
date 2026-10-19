import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { persistSession } from '@/components/redux-provider';
import { clearSession } from '@/store/auth-slice';
import { useAppDispatch } from '@/store/hooks';

export function LogoutButton() {
  const dispatch = useAppDispatch();

  async function logout() {
    try {
      await persistSession(null);
    } catch (error) {
      Alert.alert(
        'Não foi possível encerrar a sessão',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
      return;
    }
    dispatch(clearSession());
    router.replace('/login');
  }

  return (
    <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.button}>
      <Text style={styles.text}>Sair</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 48, alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 9 },
  text: { color: '#536455', fontSize: 12, fontWeight: '700' },
});
