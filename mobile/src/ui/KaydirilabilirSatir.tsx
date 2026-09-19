import { useImperativeHandle, forwardRef } from 'react';
import { View, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import { ikonRenk } from './renkler';

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
 */
const KaydirilabilirSatir = forwardRef<KaydirilabilirSatirRef, Props>(function KaydirilabilirSatir(
  { onSil, silEtiketi, children },
  ref,
) {
  const translateX = useSharedValue(0);
  const baslangicX = useSharedValue(0);

  function kapat() {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
  }

  useImperativeHandle(ref, () => ({ kapat }));

  const panHareketi = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      baslangicX.value = translateX.value;
    })
    .onUpdate((olay) => {
      const yeni = baslangicX.value + olay.translationX;
      translateX.value = Math.min(0, Math.max(-ACILMA_GENISLIGI, yeni));
    })
    .onEnd(() => {
      const acik = translateX.value < -ACILMA_ESIGI;
      translateX.value = withSpring(acik ? -ACILMA_GENISLIGI : 0, { damping: 20, stiffness: 200 });
    });

  const satirStili = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function icerigeDokunuldu() {
    if (translateX.value !== 0) {
      runOnJS(kapat)();
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
