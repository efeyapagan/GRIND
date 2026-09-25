import { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Slot, Redirect, usePathname, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import { RestTimerProvider } from '@grind/shared/restTimer';
import {
  KENAR_GENISLIGI,
  YON_KARAR_ESIGI,
  geriGidilsinMi,
  geriHedefi,
} from '@grind/shared/lib/geriKaydirma';
import { useAuth } from '../../src/auth/AuthContext';
import DinlenmeKabugu from '../../src/components/DinlenmeKabugu';
import KabukBaslik from '../../src/ui/KabukBaslik';
import KabukTabBar from '../../src/ui/KabukTabBar';

/** Birakinca sayfanin disari kaymasi (ms) -- web kabuguyla ayni. */
const ANIMASYON_MS = 150;

/**
 * Korumali alanin ortak kabugu (App.tsx). `isAuthenticated` false ise `/login`'e yonlendirir
 * (web/src/auth/ProtectedRoute.tsx ile ayni sozlesme).
 */
export default function TabsLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <PageTitleProvider>
      <RestTimerProvider>
        <View className="flex-1 bg-bg">
          <KabukBaslik />
          {/* Global bir alt bosluk BILEREK yok (issue #159, kullanici karari): "+" dugmesinin
              halkasindan pay ayirmak icin TUM sayfalara rezerve edilen bosluk "olu alan" olarak
              goruldu. Bunun yerine sadece halkanin KESINLIKLE ustune binmemesi gereken spesifik
              bilesenler (bkz. `KabukTabBar`'daki `TABBAR_HALKA_TASMASI`) kendi payini alir; sıradan
              kaydirilabilir icerik halkanin arkasina gecebilir. */}
          <GeriKaydirilabilirIcerik />
          <KabukTabBar />
          {/* Dinlenme sayacinin genis paneli ust barin USTUNE cizilir ve onu kaplar (en son cocuk =
              en ustte); kucultulmus hali barin ortasinda `DinlenmeGostergesi` olarak durur. Ikisi
              ayni anda gorunmez. */}
          <DinlenmeKabugu />
        </View>
      </RestTimerProvider>
    </PageTitleProvider>
  );
}

/**
 * Sol kenardan saga kaydirinca bir onceki sayfa (#232, web'deki `useGeriKaydirma` ile ayni kurallar:
 * `@grind/shared/lib/geriKaydirma`). Yalnizca sayfa icerigi kayar; baslik ve alt menu yerinde kalir.
 *
 * `Slot` korunur: `Stack` + `fullScreenGestureEnabled` yalnizca iOS'ta calisir ve kabugu yeniden
 * kurardi. Hareket JS thread'inde calisir (`runOnJS(true)`): paylasilan karar fonksiyonlari worklet
 * degil ve yonlendirme zaten JS'te.
 */
function GeriKaydirilabilirIcerik() {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const kayma = useSharedValue(0);

  // Kayma yeni sayfa cizildikten sonra sifirlanir -- gezinmeden once sifirlamak eski sayfayi bir an
  // yerinde gosterirdi.
  useEffect(() => {
    kayma.value = 0;
  }, [pathname, kayma]);

  function geriGit() {
    const hedef = geriHedefi(pathname, router.canGoBack());
    if (hedef === 'geri') {
      router.back();
    } else if (hedef === 'anaSayfa') {
      router.replace('/');
    }
  }

  const geriHareketi = Gesture.Pan()
    .runOnJS(true)
    .enabled(geriHedefi(pathname, true) !== 'yok')
    .hitSlop({ left: 0, width: KENAR_GENISLIGI })
    .activeOffsetX(YON_KARAR_ESIGI)
    .failOffsetY([-YON_KARAR_ESIGI, YON_KARAR_ESIGI])
    .onUpdate((olay) => {
      kayma.value = Math.max(0, olay.translationX);
    })
    .onEnd((olay) => {
      if (geriGidilsinMi(olay.translationX, olay.velocityX, width)) {
        kayma.value = withTiming(width, { duration: ANIMASYON_MS });
        setTimeout(geriGit, ANIMASYON_MS);
      } else {
        kayma.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const icerikStili = useAnimatedStyle(() => ({
    transform: [{ translateX: kayma.value }],
  }));

  return (
    <GestureDetector gesture={geriHareketi}>
      <Animated.View className="flex-1" style={icerikStili}>
        <Slot />
      </Animated.View>
    </GestureDetector>
  );
}
