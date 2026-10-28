import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";

type GoogleMobileAds = typeof import("react-native-google-mobile-ads");

const productionAdUnitId =
  Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID
    : Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS
      : undefined;

const useTestAds =
  __DEV__ || process.env.EXPO_PUBLIC_ADMOB_USE_TEST_ADS === "true";

const isExpoGo = Constants.appOwnership === "expo";

export function AdMobBanner() {
  const [isReady, setIsReady] = useState(false);
  const [hasAdLoaded, setHasAdLoaded] = useState(false);
  const [adsSdk, setAdsSdk] = useState<GoogleMobileAds | null>(null);
  const [adUnitId, setAdUnitId] = useState<string | undefined>();
  const [placeholderText, setPlaceholderText] = useState(
    isExpoGo ? "Anúncios disponíveis no APK development" : "Carregando anúncio...",
  );

  useEffect(() => {
    if (isExpoGo) {
      return;
    }

    let isMounted = true;

    async function prepareAds() {
      const ads = await import("react-native-google-mobile-ads");
      if (!isMounted) {
        return;
      }

      setAdsSdk(ads);
      const unitId = useTestAds ? ads.TestIds.ADAPTIVE_BANNER : productionAdUnitId;
      if (!unitId) {
        setPlaceholderText("ID do banner não configurado");
        return;
      }

      setAdUnitId(unitId);
      const { canRequestAds } = await ads.AdsConsent.gatherConsent();
      if (!isMounted) {
        return;
      }

      if (!canRequestAds) {
        setPlaceholderText("Consentimento não liberou anúncios");
        return;
      }

      await ads.default().initialize();
      if (isMounted) {
        setIsReady(true);
      }
    }

    prepareAds().catch((error: unknown) => {
      console.error(
        "Não foi possível inicializar os anúncios do AdMob.",
        error,
      );
      if (isMounted) {
        const details = error instanceof Error ? error.message : String(error);
        setPlaceholderText(`Erro ao carregar anúncios: ${details}`);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const BannerAd = adsSdk?.BannerAd;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.bannerContainer}>
        {isReady && BannerAd && adUnitId && adsSdk && (
          <BannerAd
            unitId={adUnitId}
            size={adsSdk.BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
            onAdLoaded={() => setHasAdLoaded(true)}
            onAdFailedToLoad={(error) => {
              console.error("Falha ao carregar o banner do AdMob.", error);
              setHasAdLoaded(false);
              const reason = error.reason ?? error.code ?? "erro desconhecido";
              setPlaceholderText(`${reason}: ${error.message}`);
            }}
          />
        )}
        {!hasAdLoaded && (
          <View pointerEvents="none" style={styles.placeholder}>
            <Text numberOfLines={2} style={styles.placeholderText}>
              {placeholderText}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#fff",
  },
  bannerContainer: {
    alignItems: "center",
    borderTopColor: "#e8ede5",
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
    justifyContent: "center",
    position: "relative",
  },
  placeholder: {
    alignItems: "center",
    backgroundColor: "#f5f7f2",
    bottom: 0,
    left: 0,
    justifyContent: "center",
    minHeight: 60,
    position: "absolute",
    right: 0,
    top: 0,
  },
  placeholderText: {
    color: "#69736a",
    fontSize: 12,
    paddingHorizontal: 8,
    textAlign: "center",
  },
});
