import { useImperativeHandle, forwardRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import { useIkonRenk } from './renkler';

const ACILMA_GENISLIGI = 96;
const ACILMA_ESIGI = ACILMA_GENISLIGI / 2;

export interface KaydirilabilirSatirRef {
  kapat: () => void;
}

interface Props {
  onSil: () => void;
  silEtiketi: string;
  children: React.ReactNode;
}

/**
 * web/src/lib/kaydirma.ts + GecmisKarti'ndeki sola-kaydirma kisayolunun RN karsiligi (issue #46,
 * Faz 3 cilalama). Web'de bu ZATEN ikincil bir kisayoldu (birincil yol icerik acilinca gorunen
 * "Antrenmanı sil" dugmesiydi, o GecmisKarti'nda aynen kalir) -- burada da ayni ikincil rolde:
 * kaydirma acar, dokunmak kapatir, "Sil" butonuna basmak siler.
 *
 * Satir kapaliyken hareket YALNIZCA sola aktiflesir (#232): saga kaydirma kabugun sol kenardan geri
 * donme hareketine kalir -- satir ekranin kenarina kadar uzandigi icin aksi halde onu yutardi. Acik
 * satirda bugunku gibi iki yon de satirindir (saga kaydirmak kapatir).
 *
 * Jest zinciri `Gesture.Pan()` ile baslamadigi icin Babel eklentisi callback'leri kendiliginden
 * worklet yapmaz; `'worklet'` direktifleri bu yuzden acik yazili (#297), yoksa UI thread'i yerine JS
 * thread'inde calisirlar.
 */
const KaydirilabilirSatir = forwardRef<KaydirilabilirSatirRef, Props>(function KaydirilabilirSatir(
  { onSil, silEtiketi, children },
  ref,
) {
  const ikonRenk = useIkonRenk();
  const translateX = useSharedValue(0);
  const baslangicX = useSharedValue(0);
  const [acik, setAcik] = useState(false);

  function kapat() {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    setAcik(false);
  }

  useImperativeHandle(ref, () => ({ kapat }));

  const pan = Gesture.Pan();
  if (acik) {
    pan.activeOffsetX([-10, 10]);
  } else {
    pan.activeOffsetX(-10).failOffsetX(10);
  }
  const panHareketi = pan
    .failOffsetY([-10, 10])
    .onStart(() => {
      'worklet';
      baslangicX.value = translateX.value;
    })
    .onUpdate((olay) => {
      'worklet';
      const yeni = baslangicX.value + olay.translationX;
      translateX.value = Math.min(0, Math.max(-ACILMA_GENISLIGI, yeni));
    })
    .onEnd(() => {
      'worklet';
      const acilsin = translateX.value < -ACILMA_ESIGI;
      translateX.value = withSpring(acilsin ? -ACILMA_GENISLIGI : 0, { damping: 20, stiffness: 200 });
      runOnJS(setAcik)(acilsin);
    });

  const satirStili = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function icerigeDokunuldu() {
    if (translateX.value !== 0) {
      kapat();
    }
  }

  return (
    <View className="relative overflow-hidden rounded-xl">
      <View className="absolute inset-y-0 right-0 w-24">
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={() => {
            kapat();
            onSil();
          }}
          className="h-full w-full items-center justify-center gap-1 bg-danger-bg"
        >
          <Trash2 color={ikonRenk.onDanger} size={20} />
        </Pressable>
      </View>
      <GestureDetector gesture={panHareketi}>
        <Animated.View style={satirStili}>
          <Pressable onPress={icerigeDokunuldu} accessibilityLabel={silEtiketi}>
            {children}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

export default KaydirilabilirSatir;
