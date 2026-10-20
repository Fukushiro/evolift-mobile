import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ReduxProvider } from '@/components/redux-provider';

export default function RootLayout() {
  return (
    <ReduxProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f5f7f2' } }}>
        <Stack.Screen name="index" />
      </Stack>
    </ReduxProvider>
  );
}
