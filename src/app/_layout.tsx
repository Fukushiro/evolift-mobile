import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { AdMobBanner } from '@/components/admob-banner';
import { ReduxProvider } from '@/components/redux-provider';

export default function RootLayout() {
  return (
    <ReduxProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f5f7f2' } }}>
          <Stack.Screen name="index" />
        </Stack>
        <AdMobBanner />
      </View>
    </ReduxProvider>
  );
}
