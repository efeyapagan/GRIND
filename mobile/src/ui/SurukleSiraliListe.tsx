import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { indeksleTasi, surukleHedefIndeksi } from '@grind/shared/lib/siralama';

/** Surukleme bu kadar basili tuttuktan SONRA aktiflesir; altindaki liste kaydirmasi bozulmasin diye. */
const BASILI_TUTMA_MS = 250;
/** Satirlar arasi bosluk (Tailwind gap-2). Bir siranin yuksekligi = olculen satir + bu. */
const ARALIK = 8;
const KAYMA_SURESI_MS = 140;

interface Props<T> {
  ogeler: readonly T[];
  anahtar: (oge: T) => string | number;
  satirCiz: (oge: T, suruklenen: boolean) => ReactNode;
  /** Parmak birakildiginda YALNIZCA sira degistiyse cagrilir. */
  onSirala: (yeniSira: T[]) => void;
}

interface SatirProps {
  indeks: number;
  adet: number;
  aktif: SharedValue<number>;
  hedef: SharedValue<number>;
  oteleme: SharedValue<number>;
  satirYuksekligi: SharedValue<number>;
  onBasla: (indeks: number) => void;
  onBitir: (indeks: number, hedefIndeks: number) => void;
  children: ReactNode;
}

/**
 * Basili tutup surukleyerek sira degistiren liste (#344 — antrenman ekranindaki "Şablonla başla").
 *
 * Kutuphane EKLENMEDI: hazir surukle-birak listeleri (draggable-flatlist gibi) bu ekran icin
 * gereginden buyuk ve Reanimated 4 / RN 0.86 uyumlulugu ayri bir bakim yuku olurdu. Liste kisa ve
 * satirlar esit yuksekte oldugu icin hesap tek satira siger: parmagin dikey otelemesi / satir
 * yuksekligi = kac sira tasindi (`surukleHedefIndeksi`, ortak pakette ve test edilmis).
 *
 * Jest callback'leri `runOnJS(true)` ile JS thread'inde calisir (Takvim ve DinlenmeKabugu'ndaki
 * gibi): hesap ortak paketten geldigi icin worklet'e kapatilamaz -- worklet'ten normal bir JS
 * fonksiyonu cagrilamaz. Liste kisa, her karede yapilan is bir bolme ve bir yuvarlama.
 *
 * Surukleme SIRASINDA dizi degismez: suruklenen satir parmagi takip eder, aradaki satirlar bir
 * sira yukari/asagi kayar. Dizi yalnizca parmak kalkinca, tek seferde yeniden siralanir.
 */
export default function SurukleSiraliListe<T>({ ogeler, anahtar, satirCiz, onSirala }: Props<T>) {
  const aktif = useSharedValue(-1);
  const hedef = useSharedValue(-1);
  const oteleme = useSharedValue(0);
  const satirYuksekligi = useSharedValue(0);
  const [suruklenenIndeks, setSuruklenenIndeks] = useState<number | null>(null);

  function basla(indeks: number) {
    setSuruklenenIndeks(indeks);
  }

  function bitir(indeks: number, hedefIndeks: number) {
    setSuruklenenIndeks(null);
    if (hedefIndeks !== indeks) {
      onSirala(indeksleTasi(ogeler, indeks, hedefIndeks));
    }
  }

  return (
    <View style={{ gap: ARALIK }}>
      {ogeler.map((oge, indeks) => (
        <Satir
          key={anahtar(oge)}
          indeks={indeks}
          adet={ogeler.length}
          aktif={aktif}
          hedef={hedef}
          oteleme={oteleme}
          satirYuksekligi={satirYuksekligi}
          onBasla={basla}
          onBitir={bitir}
        >
          {satirCiz(oge, suruklenenIndeks === indeks)}
        </Satir>
      ))}
    </View>
  );
}

function Satir({
  indeks,
  adet,
  aktif,
  hedef,
  oteleme,
  satirYuksekligi,
  onBasla,
  onBitir,
  children,
}: SatirProps) {
  const surukleme = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(BASILI_TUTMA_MS)
    .onStart(() => {
      aktif.value = indeks;
      hedef.value = indeks;
      oteleme.value = 0;
      onBasla(indeks);
    })
    .onUpdate((olay) => {
      oteleme.value = olay.translationY;
      hedef.value = surukleHedefIndeksi(indeks, olay.translationY, satirYuksekligi.value, adet);
    })
    .onEnd((olay) => {
      const hedefIndeks = surukleHedefIndeksi(indeks, olay.translationY, satirYuksekligi.value, adet);
      aktif.value = -1;
      hedef.value = -1;
      oteleme.value = 0;
      onBitir(indeks, hedefIndeks);
    });

  const stil = useAnimatedStyle(() => {
    if (aktif.value === -1) {
      return { transform: [{ translateY: 0 }], zIndex: 0 };
    }
    if (aktif.value === indeks) {
      // Suruklenen satir parmagi birebir takip eder ve digerlerinin USTUNDE kalir.
      return { transform: [{ translateY: oteleme.value }], zIndex: 2 };
    }
    const asagidan = aktif.value < indeks && indeks <= hedef.value;
    const yukaridan = hedef.value <= indeks && indeks < aktif.value;
    const kayma = asagidan ? -satirYuksekligi.value : yukaridan ? satirYuksekligi.value : 0;
    return {
      transform: [{ translateY: withTiming(kayma, { duration: KAYMA_SURESI_MS }) }],
      zIndex: 0,
    };
  });

  // Bir "sira" satirin kendisi + aradaki bosluk; hesap bunun uzerinden yuruyor.
  function olculdu(olay: LayoutChangeEvent) {
    satirYuksekligi.value = olay.nativeEvent.layout.height + ARALIK;
  }

  return (
    <GestureDetector gesture={surukleme}>
      <Animated.View testID="surukle-satir" onLayout={olculdu} style={stil}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
