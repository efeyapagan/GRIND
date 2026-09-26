import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { indeksleTasi, surukleHedefIndeksi } from '@grind/shared/lib/siralama';

/** Surukleme bu kadar basili tuttuktan SONRA aktiflesir; altindaki liste kaydirmasi bozulmasin diye. */
const BASILI_TUTMA_MS = 250;
/** Varsayilan satir araligi (Tailwind gap-2). Bir siranin yuksekligi = olculen satir + aralik. */
const VARSAYILAN_ARALIK = 8;
/** Komsu satirlarin yer acmak icin kaymasi ve birakilan satirin yuvasina oturmasi. */
const KAYMA_SURESI_MS = 200;
/** Suruklenen satir hafifce buyur: parmagin altinda "kalkik" oldugu gorulsun (#407). */
const KALKIK_OLCEK = 1.03;
/** Birakilinca yeni sira ust bilesenden gelmezse (ör. sira degismedi) otelemeler bu surede sifirlanir. */
const SIFIRLAMA_YEDEGI_MS = 600;

interface Props<T> {
  ogeler: readonly T[];
  anahtar: (oge: T) => string | number;
  satirCiz: (oge: T, suruklenen: boolean) => ReactNode;
  /** Parmak birakildiginda YALNIZCA sira degistiyse cagrilir. */
  onSirala: (yeniSira: T[]) => void;
  /** Satirlar arasi bosluk (px); sira yuksekligi hesabina da girer. */
  aralik?: number;
}

interface Durum {
  aktif: SharedValue<number>;
  hedef: SharedValue<number>;
  oteleme: SharedValue<number>;
  /** Suruklenen satirin sirasi (boy + aralik): komsular bu kadar kayar. */
  suruklenenSira: SharedValue<number>;
}

interface SatirProps {
  indeks: number;
  durum: Durum;
  hedefBul: (indeks: number, otelemeY: number) => number;
  onOlcum: (indeks: number, yukseklik: number) => void;
  onBasla: (indeks: number) => void;
  onBirak: (indeks: number, otelemeY: number) => void;
  children: ReactNode;
}

/**
 * Basili tutup surukleyerek sira degistiren liste (#344 — antrenman ekranindaki "Şablonla başla";
 * #407 — acik antrenmanin hareket kartlari).
 *
 * Kutuphane EKLENMEDI: hazir surukle-birak listeleri (draggable-flatlist gibi) bu ekran icin
 * gereginden buyuk ve Reanimated 4 / RN 0.86 uyumlulugu ayri bir bakim yuku olurdu.
 *
 * Her satir kendi yuksekligini olcer (#407: hareket kartlari set sayisina gore uzar); olcumler
 * JS tarafinda bir ref'te durur, cunku jest callback'leri `runOnJS(true)` ile zaten JS thread'inde
 * calisir ve hedef hesabi (`surukleHedefIndeksi`) ortak paketten gelir. UI thread'ine yalnizca
 * animasyonun ihtiyac duydugu sayilar (suruklenen satir, hedef, oteleme, suruklenenin boyu) gider --
 * bir diziyi paylasilan degerde tutmak, ayni karede gelen olcumlerin birbirini ezmesine yol aciyordu.
 *
 * Surukleme SIRASINDA dizi degismez: suruklenen satir parmagi takip eder, aradaki satirlar suruklenenin
 * boyu kadar kayarak yer acar. Parmak kalkinca suruklenen satir yuvasina kayarak oturur, SONRA dizi
 * tek seferde yeniden siralanir; otelemeler yeni sira gelince sifirlanir ki kartlar yerinden sicramasin.
 */
export default function SurukleSiraliListe<T>({
  ogeler,
  anahtar,
  satirCiz,
  onSirala,
  aralik = VARSAYILAN_ARALIK,
}: Props<T>) {
  const durum: Durum = {
    aktif: useSharedValue(-1),
    hedef: useSharedValue(-1),
    oteleme: useSharedValue(0),
    suruklenenSira: useSharedValue(0),
  };
  const yukseklikler = useRef<number[]>([]);
  const sifirlamaZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suruklenenIndeks, setSuruklenenIndeks] = useState<number | null>(null);
  const siraImzasi = ogeler.map(anahtar).join(',');

  function sifirla() {
    if (sifirlamaZamanlayici.current) {
      clearTimeout(sifirlamaZamanlayici.current);
      sifirlamaZamanlayici.current = null;
    }
    durum.aktif.value = -1;
    durum.hedef.value = -1;
    durum.oteleme.value = 0;
  }

  // Yeni sira geldi: satirlar yeni yerlerinde, otelemeler artik gereksiz. Bagimlilik bilerek yalnizca
  // sira: ust bilesen her cizimde yeni dizi verebilir (ör. dinlenme sayaci), bu surukleme ortasinda sifirlardi.
  useLayoutEffect(() => {
    sifirla();
  }, [siraImzasi]);

  function olcum(indeks: number, yukseklik: number) {
    yukseklikler.current[indeks] = yukseklik + aralik;
  }

  function olculenler() {
    return Array.from({ length: ogeler.length }, (_, indeks) => yukseklikler.current[indeks] ?? 0);
  }

  function hedefBul(indeks: number, otelemeY: number) {
    return surukleHedefIndeksi(indeks, otelemeY, olculenler());
  }

  function basla(indeks: number) {
    sifirla();
    durum.suruklenenSira.value = olculenler()[indeks];
    durum.aktif.value = indeks;
    durum.hedef.value = indeks;
    setSuruklenenIndeks(indeks);
  }

  function yerlesti(indeks: number, hedefIndeks: number) {
    setSuruklenenIndeks(null);
    if (hedefIndeks === indeks) {
      sifirla();
      return;
    }
    onSirala(indeksleTasi(ogeler, indeks, hedefIndeks));
    sifirlamaZamanlayici.current = setTimeout(sifirla, SIFIRLAMA_YEDEGI_MS);
  }

  function birak(indeks: number, otelemeY: number) {
    const hedefIndeks = hedefBul(indeks, otelemeY);
    const siralar = olculenler();
    // Yuva: suruklenen satirin yeni yerinin eski yerine uzakligi -- aradaki satirlarin toplam boyu.
    const yuva =
      hedefIndeks > indeks
        ? siralar.slice(indeks + 1, hedefIndeks + 1).reduce((a, b) => a + b, 0)
        : -siralar.slice(hedefIndeks, indeks).reduce((a, b) => a + b, 0);
    durum.hedef.value = hedefIndeks;
    durum.oteleme.value = withTiming(yuva, { duration: KAYMA_SURESI_MS }, () => {
      runOnJS(yerlesti)(indeks, hedefIndeks);
    });
  }

  return (
    <View style={{ gap: aralik }}>
      {ogeler.map((oge, indeks) => (
        <Satir
          key={anahtar(oge)}
          indeks={indeks}
          durum={durum}
          hedefBul={hedefBul}
          onOlcum={olcum}
          onBasla={basla}
          onBirak={birak}
        >
          {satirCiz(oge, suruklenenIndeks === indeks)}
        </Satir>
      ))}
    </View>
  );
}

function Satir({ indeks, durum, hedefBul, onOlcum, onBasla, onBirak, children }: SatirProps) {
  const { aktif, hedef, oteleme, suruklenenSira } = durum;
  const surukleme = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(BASILI_TUTMA_MS)
    .onStart(() => {
      onBasla(indeks);
    })
    .onUpdate((olay) => {
      oteleme.value = olay.translationY;
      hedef.value = hedefBul(indeks, olay.translationY);
    })
    .onEnd((olay) => {
      onBirak(indeks, olay.translationY);
    });

  const stil = useAnimatedStyle(() => {
    if (aktif.value === -1) {
      return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0 };
    }
    if (aktif.value === indeks) {
      // Suruklenen satir parmagi birebir takip eder, hafifce buyur ve digerlerinin USTUNDE kalir.
      return { transform: [{ translateY: oteleme.value }, { scale: KALKIK_OLCEK }], zIndex: 2 };
    }
    // Aradaki satirlar suruklenenin BOYU kadar kayar -- onun biraktigi boslugu doldururlar.
    const asagidan = aktif.value < indeks && indeks <= hedef.value;
    const yukaridan = hedef.value <= indeks && indeks < aktif.value;
    const kayma = asagidan ? -suruklenenSira.value : yukaridan ? suruklenenSira.value : 0;
    return {
      transform: [{ translateY: withTiming(kayma, { duration: KAYMA_SURESI_MS }) }, { scale: 1 }],
      zIndex: 0,
    };
  });

  function olculdu(olay: LayoutChangeEvent) {
    onOlcum(indeks, olay.nativeEvent.layout.height);
  }

  return (
    <GestureDetector gesture={surukleme}>
      <Animated.View testID="surukle-satir" onLayout={olculdu} style={stil}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
