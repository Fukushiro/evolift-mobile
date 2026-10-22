import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import mobileAds, {
  AdsConsent,
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

const productionAdUnitId =
  Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID
    : Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS
      : undefined;

const useTestAds =
  __DEV__ || process.env.EXPO_PUBLIC_ADMOB_USE_TEST_ADS === 'true';

const adUnitId = useTestAds
  ? TestIds.ADAPTIVE_BANNER
  : productionAdUnitId;

export function AdMobBanner() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!adUnitId) {
      return;
    }

    let isMounted = true;

    async function prepareAds() {
      const { canRequestAds } = await AdsConsent.gatherConsent();
      if (canRequestAds) {
        await mobileAds().initialize();
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    prepareAds().catch((error: unknown) => {
      console.error('Não foi possível inicializar os anúncios do AdMob.', error);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady || !adUnitId) {
    return null;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
          onAdFailedToLoad={(error) => {
            console.error('Falha ao carregar o banner do AdMob.', error);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  bannerContainer: {
    alignItems: 'center',
    borderTopColor: '#e8ede5',
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 1,
  },
});
