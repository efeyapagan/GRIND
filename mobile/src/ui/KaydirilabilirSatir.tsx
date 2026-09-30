import { useImperativeHandle, forwardRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useIkonRenk } from './renkler';

/** Bir kisayol dugmesinin genisligi; acilma genisligi = dugme sayisi x bu. */
const DUGME_GENISLIGI = 96;

export interface KaydirilabilirSatirRef {
  kapat: () => void;
}

interface Props {
  onSil: () => void;
  /** Verilirse Sil'in SAGINDA bir "duzenle" kisayolu da acilir (#435); verilmezse satir tek dugmeli kalir. */
  onDuzenle?: () => void;
  /** Satirin erisilebilirlik etiketi: kisayollar ekran okuyucudan gizli, yol bu etiketten anlatilir. */
  kaydirmaEtiketi: string;
  /** Kisayollar acilip kapandikca cagrilir -- ust bilesen acik satirda dokunusu baska yorumlayabilsin. */
  onAcikDegisti?: (acik: boolean) => void;
  /** Satirin kose sinifi; kart cam ise (`rounded-3xl`) kirpma koseleri kartinkiyle ayni olmali (#491). */
  koseSinifi?: string;
  children: React.ReactNode;
}

/**
 * web/src/lib/kaydirma.ts + GecmisKarti'ndeki sola-kaydirma kisayolunun RN karsiligi (issue #46,
 * Faz 3 cilalama). Web'de bu ZATEN ikincil bir kisayoldu (birincil yol icerik acilinca gorunen
 * "Antrenmanı sil" dugmesiydi, o GecmisKarti'nda aynen kalir) -- burada da ayni ikincil rolde:
 * kaydirma acar, dokunmak kapatir, "Sil" butonuna basmak siler.
 *
 * #435: satir artik ikinci bir kisayol (duzenle) tasiyabiliyor -- antrenman ekranindaki sablon
 * kartlari icin. Ikinci dugme opsiyoneldir, cunku `GecmisKarti`'nin silmekten baska bir kisayolu yok.
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
  { onSil, onDuzenle, kaydirmaEtiketi, onAcikDegisti, koseSinifi = 'rounded-xl', children },
  ref,
) {
  const ikonRenk = useIkonRenk();
  const translateX = useSharedValue(0);
  const baslangicX = useSharedValue(0);
  const [acik, setAcik] = useState(false);
  const acilmaGenisligi = onDuzenle ? DUGME_GENISLIGI * 2 : DUGME_GENISLIGI;
  const acilmaEsigi = acilmaGenisligi / 2;

  function aciklikDegisti(yeni: boolean) {
    setAcik(yeni);
    onAcikDegisti?.(yeni);
  }

  function kapat() {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    aciklikDegisti(false);
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
      translateX.value = Math.min(0, Math.max(-acilmaGenisligi, yeni));
    })
    .onEnd(() => {
      'worklet';
      const acilsin = translateX.value < -acilmaEsigi;
      translateX.value = withSpring(acilsin ? -acilmaGenisligi : 0, { damping: 20, stiffness: 200 });
      runOnJS(aciklikDegisti)(acilsin);
    });

  const satirStili = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // #491: cam kart yari saydam; kirmizi zemin kartin altinda bulunursa gorunur. Katman yalnizca kartin
  // actigi bosluk kadar genis (sagdan sola), dugmeler icerde sabit genislikte sagda durur.
  const kisayolStili = useAnimatedStyle(() => ({
    width: Math.max(0, -translateX.value),
  }));

  function icerigeDokunuldu() {
    if (translateX.value !== 0) {
      kapat();
    }
  }

  function kisayol(islem: () => void) {
    kapat();
    islem();
  }

  return (
    <View testID="kaydirilabilir-satir" className={`relative overflow-hidden ${koseSinifi}`}>
      {/* Kisayollar ekran okuyucudan gizli: satirin KENDISI `kaydirmaEtiketi`ni tasir (#46 deseni). */}
      <Animated.View
        testID="kaydir-kisayollar"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={`absolute inset-y-0 right-0 overflow-hidden ${koseSinifi}`}
        style={kisayolStili}
      >
        <View className="absolute inset-y-0 right-0 flex-row" style={{ width: acilmaGenisligi }}>
          <Pressable
            testID="kaydir-sil"
            onPress={() => kisayol(onSil)}
            className="h-full w-24 items-center justify-center bg-danger-bg"
          >
            <Trash2 color={ikonRenk.onDanger} size={20} />
          </Pressable>
          {onDuzenle && (
            <Pressable
              testID="kaydir-duzenle"
              onPress={() => kisayol(onDuzenle)}
              className="h-full w-24 items-center justify-center bg-accent"
            >
              <Pencil color={ikonRenk.onAccent} size={20} />
            </Pressable>
          )}
        </View>
      </Animated.View>
      <GestureDetector gesture={panHareketi}>
        <Animated.View style={satirStili}>
          <Pressable onPress={icerigeDokunuldu} accessibilityLabel={kaydirmaEtiketi}>
            {children}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

export default KaydirilabilirSatir;
