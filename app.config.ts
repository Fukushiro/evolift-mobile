import type { ConfigContext, ExpoConfig } from 'expo/config';

const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';

const productionAdMobVariables = {
  EXPO_PUBLIC_ADMOB_ANDROID_APP_ID: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
  EXPO_PUBLIC_ADMOB_IOS_APP_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
  EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID,
  EXPO_PUBLIC_ADMOB_BANNER_ID_IOS: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS,
};

if (isProductionBuild) {
  const missingVariables = Object.entries(productionAdMobVariables)
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing production AdMob environment variables: ${missingVariables.join(', ')}`,
    );
  }
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'evolift-app',
  slug: config.slug ?? 'evolift',
  plugins: [
    ...(config.plugins ?? []),
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || TEST_ANDROID_APP_ID,
        iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || TEST_IOS_APP_ID,
        delayAppMeasurementInit: true,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraProguardRules: '-keep class com.google.android.gms.internal.consent_sdk.** { *; }',
        },
      },
    ],
  ],
});
