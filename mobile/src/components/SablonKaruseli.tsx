import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { Sablon } from '@grind/shared/api/queries';
import { indeksleTasi, surukleHedefIndeksi } from '@grind/shared/lib/siralama';
import { useKalkikGolge } from '../ui/renkler';

/** Menu ve surukleme bu kadar basili tuttuktan SONRA baslar; daha kisa dokunus karuseli kaydirir. */
const BASILI_TUTMA_MS = 400;
/** Basili tutarken parmak bu kadar yana kayarsa menu kapanir, surukleme baslar. */
const SURUKLEME_ESIGI = 10;
/** Parmak ekran kenarina bu kadar yaklasinca karusel o yone kendiliginden kayar. */
const KENAR_BOLGESI = 48;
/** Kenarda kendiliginden kayma hizi (px / kare). */
const KENAR_HIZI = 8;
const KARE_MS = 16;
const KAYMA_SURESI_MS = 200;
/** Suruklenen kart buyur ve golge dusurur: parmagin altinda havada "suzuldugu" gorulsun. */
const KALKIK_OLCEK = 1.06;
/**
 * Karuselin dikey nefes payi: `ScrollView` cocuklarini KENDI cercevesine kirpar, kalkik kart ise
 * hem buyudugu hem golge dusurdugu icin cerceveden tasar -- pay olmadan ustten kirpiliyor ve kart
 * basligin altinda kayboluyormus gibi gorunuyordu. Pay icerige verilip ayni kadar negatif kenar
 * bosluguyla geri alinir: kirpma kutusu buyur, yerlesim oldugu gibi kalir (yatayda `-mx-4` / `px-4`
 * ile ayni desen).
 *
 * Ust ve alt AYRI: pay komsunun boslugundan borc alir, daha fazlasi komsunun DOKUNUSUNU calar.
 * Ustte basliga 12, altta "Boş antrenman başlat" dugmesine 20 birim bosluk var. Golge asagi
 * dustugu icin bu asimetri ayni zamanda ise yarar; `useKalkikGolge`nin olculeri bu paya gore secili.
 */
const UST_PAY = 12;
const ALT_PAY = 20;
/** Birakilinca yeni sira ust bilesenden gelmezse otelemeler bu surede sifirlanir. */
const SIFIRLAMA_YEDEGI_MS = 600;

interface Props {
  sablonlar: readonly Sablon[];
  kartGenisligi: number;
  aralik: number;
  /** Kartin kendisi; `onBasla` surukleme/menu sirasinda dokunusu yutan sarmalanmis halidir. */
  kartCiz: (sablon: Sablon, onBasla: () => void) => ReactNode;
  onBasla: (sablon: Sablon) => void;
  onMenuAc: (sablon: Sablon) => void;
  /** Basili tutarken parmak kaydi: menu surukleme icin kapanir. */
  onMenuKapat: () => void;
  /** Parmak birakildiginda YALNIZCA sira degistiyse cagrilir. */
  onSirala: (yeniSira: Sablon[]) => void;
}

interface Surukleme {
  indeks: number;
  suruyor: boolean;
  /** Parmagin baslangictan yatay yer degistirmesi. */
  parmakX: number;
  /** Parmagin ekrandaki yatay konumu (kenar kaydirmasi icin). */
  mutlakX: number;
  /** Surukleme basladigindaki karusel kaydirmasi: kenar kaydirmasi karti parmagin altinda tutar. */
  baslangicKaydirma: number;
}

interface Durum {
  aktif: SharedValue<number>;
  hedef: SharedValue<number>;
  oteleme: SharedValue<number>;
}

/**
 * #439: antrenman ekranindaki yana kayan sablon karuseli. Karta basili tutmak `SablonMenusu`nu
 * acar; parmak kalkmadan yana kayarsa menu kapanir ve kart surukleniyor olur (iPhone ana ekrani
 * gibi). Parmak ekran kenarina gelince karusel o yone kayar -- ekranda bir bucuk kart gorundugu icin
 * bu olmadan bir kart yalnizca bir komsusuyla yer degistirebilirdi. Birakinca sira SUNUCUYA gider
 * (`onSirala`), "Şablonları yönet"teki dikey siralamayla ayni veri.
 *
 * Neden `SurukleSiraliListe` degil: o dikey, kendi kapsayicisi var ve menu devri ya da kenar
 * kaydirmasi bilmiyor. Hedef hesabi ve tasima ONUNLA AYNI ortak fonksiyonlardan
 * (`surukleHedefIndeksi`, `indeksleTasi`) gelir; kartlar esit genislikte oldugu icin olcum gerekmez.
 *
 * Jest callback'leri `runOnJS(true)` ile JS thread'inde calisir; surukleme durumu bir ref'te durur
 * ki onceki cizimden kalmis bir jest de guncel durumu gorsun.
 */
export default function SablonKaruseli({
  sablonlar,
  kartGenisligi,
  aralik,
  kartCiz,
  onBasla,
  onMenuAc,
  onMenuKapat,
  onSirala,
}: Props) {
  const { width: ekranGenisligi } = useWindowDimensions();
  const durum: Durum = {
    aktif: useSharedValue(-1),
    hedef: useSharedValue(-1),
    oteleme: useSharedValue(0),
  };
  const kaydirici = useRef<ScrollView>(null);
  const surukleme = useRef<Surukleme | null>(null);
  const kaydirma = useRef(0);
  const enFazlaKaydirma = useRef(0);
  const icerikGenisligi = useRef(0);
  const gorunurGenislik = useRef(0);
  const kenarZamanlayici = useRef<ReturnType<typeof setInterval> | null>(null);
  const sifirlamaZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suruklenen, setSuruklenen] = useState<number | null>(null);
  const siraImzasi = sablonlar.map((sablon) => sablon.id).join(',');
  const sira = kartGenisligi + aralik;

  function sifirla() {
    if (sifirlamaZamanlayici.current) {
      clearTimeout(sifirlamaZamanlayici.current);
      sifirlamaZamanlayici.current = null;
    }
    durum.aktif.value = -1;
    durum.hedef.value = -1;
    durum.oteleme.value = 0;
  }

  // Yeni sira geldi: kartlar yeni yerlerinde, otelemeler artik gereksiz (SurukleSiraliListe ile ayni).
  useLayoutEffect(() => {
    sifirla();
  }, [siraImzasi]);

  // Ekrandan ayrilirken kenar kaydirmasi ya da sifirlama zamanlayicisi calisir halde kalmasin.
  useEffect(
    () => () => {
      kenarKaydirmasiniDurdur();
      if (sifirlamaZamanlayici.current) {
        clearTimeout(sifirlamaZamanlayici.current);
      }
    },
    [],
  );

  function sinirlariGuncelle() {
    enFazlaKaydirma.current = Math.max(0, icerikGenisligi.current - gorunurGenislik.current);
  }

  function hedefBul(indeks: number, oteleme: number) {
    return surukleHedefIndeksi(indeks, oteleme, sablonlar.map(() => sira));
  }

  function otelemeyiGuncelle() {
    const suren = surukleme.current;
    if (!suren) {
      return;
    }
    const oteleme = suren.parmakX + (kaydirma.current - suren.baslangicKaydirma);
    durum.oteleme.value = oteleme;
    durum.hedef.value = hedefBul(suren.indeks, oteleme);
  }

  function kenarKaydirmasiniDurdur() {
    if (kenarZamanlayici.current) {
      clearInterval(kenarZamanlayici.current);
      kenarZamanlayici.current = null;
    }
  }

  function kenarYonu() {
    const suren = surukleme.current;
    if (!suren?.suruyor) {
      return 0;
    }
    if (suren.mutlakX < KENAR_BOLGESI) {
      return -1;
    }
    return suren.mutlakX > ekranGenisligi - KENAR_BOLGESI ? 1 : 0;
  }

  function kenarKaydirmasi() {
    if (kenarZamanlayici.current || kenarYonu() === 0) {
      return;
    }
    kenarZamanlayici.current = setInterval(() => {
      const yon = kenarYonu();
      if (yon === 0) {
        kenarKaydirmasiniDurdur();
        return;
      }
      const yeni = Math.min(enFazlaKaydirma.current, Math.max(0, kaydirma.current + yon * KENAR_HIZI));
      if (yeni === kaydirma.current) {
        return;
      }
      kaydirma.current = yeni;
      kaydirici.current?.scrollTo({ x: yeni, animated: false });
      otelemeyiGuncelle();
    }, KARE_MS);
  }

  function basla(indeks: number, mutlakX: number) {
    sifirla();
    surukleme.current = { indeks, suruyor: false, parmakX: 0, mutlakX, baslangicKaydirma: kaydirma.current };
    onMenuAc(sablonlar[indeks]);
  }

  function guncelle(indeks: number, parmakX: number, mutlakX: number) {
    const suren = surukleme.current;
    if (!suren || suren.indeks !== indeks) {
      return;
    }
    suren.parmakX = parmakX;
    suren.mutlakX = mutlakX;
    if (!suren.suruyor) {
      if (Math.abs(parmakX) < SURUKLEME_ESIGI) {
        return;
      }
      suren.suruyor = true;
      onMenuKapat();
      durum.aktif.value = indeks;
      durum.hedef.value = indeks;
      setSuruklenen(indeks);
    }
    otelemeyiGuncelle();
    kenarKaydirmasi();
  }

  function yerlesti(indeks: number, hedefIndeks: number) {
    surukleme.current = null;
    setSuruklenen(null);
    if (hedefIndeks === indeks) {
      sifirla();
      return;
    }
    onSirala(indeksleTasi(sablonlar, indeks, hedefIndeks));
    sifirlamaZamanlayici.current = setTimeout(sifirla, SIFIRLAMA_YEDEGI_MS);
  }

  function birak(indeks: number) {
    kenarKaydirmasiniDurdur();
    const suren = surukleme.current;
    if (!suren || suren.indeks !== indeks) {
      return;
    }
    if (!suren.suruyor) {
      // Kaydirmadan kalkti: menu acik kalir, sira degismez.
      surukleme.current = null;
      return;
    }
    const hedefIndeks = hedefBul(indeks, durum.oteleme.value);
    durum.hedef.value = hedefIndeks;
    // Kenar kaydirmasi karuseli iki kartin arasinda birakmis olabilir: en yakin karta oturt.
    const oturan = Math.min(enFazlaKaydirma.current, Math.round(kaydirma.current / sira) * sira);
    if (oturan !== kaydirma.current) {
      kaydirma.current = oturan;
      kaydirici.current?.scrollTo({ x: oturan, animated: true });
    }
    durum.oteleme.value = withTiming((hedefIndeks - indeks) * sira, { duration: KAYMA_SURESI_MS }, () => {
      runOnJS(yerlesti)(indeks, hedefIndeks);
    });
  }

  function dokunus(sablon: Sablon) {
    // Basili tutma/surukleme sirasinda parmak kalkinca gelen dokunus antrenmani BASLATMAZ.
    if (surukleme.current) {
      return;
    }
    onBasla(sablon);
  }

  return (
    // Kartlar ekran kenarina kadar kayar: ebeveynin 16'lik yan boslugu burada geri alinip icerige verilir.
    <ScrollView
      ref={kaydirici}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={sira}
      decelerationRate="fast"
      // Surukleme sirasinda karuseli yalnizca kenar kaydirmasi oynatir; parmak onu surmez.
      scrollEnabled={suruklenen === null}
      scrollEventThrottle={KARE_MS}
      onScroll={(olay) => {
        kaydirma.current = olay.nativeEvent.contentOffset.x;
      }}
      onLayout={(olay) => {
        gorunurGenislik.current = olay.nativeEvent.layout.width;
        sinirlariGuncelle();
      }}
      onContentSizeChange={(genislik) => {
        icerikGenisligi.current = genislik;
        sinirlariGuncelle();
      }}
      className="-mx-4"
      contentContainerClassName="px-4"
      contentContainerStyle={{ gap: aralik, paddingTop: UST_PAY, paddingBottom: ALT_PAY }}
      style={{ marginTop: -UST_PAY, marginBottom: -ALT_PAY }}
    >
      {sablonlar.map((sablon, indeks) => (
        <Kart
          key={sablon.id}
          indeks={indeks}
          sira={sira}
          durum={durum}
          kalkik={suruklenen === indeks}
          onBasla={basla}
          onGuncelle={guncelle}
          onBirak={birak}
        >
          {kartCiz(sablon, () => dokunus(sablon))}
        </Kart>
      ))}
    </ScrollView>
  );
}

interface KartProps {
  indeks: number;
  sira: number;
  durum: Durum;
  /** Parmagin altindaki kart: golgeyi yalnizca o tasir. */
  kalkik: boolean;
  onBasla: (indeks: number, mutlakX: number) => void;
  onGuncelle: (indeks: number, parmakX: number, mutlakX: number) => void;
  onBirak: (indeks: number) => void;
  children: ReactNode;
}

function Kart({ indeks, sira, durum, kalkik, onBasla, onGuncelle, onBirak, children }: KartProps) {
  const { aktif, hedef, oteleme } = durum;
  const golge = useKalkikGolge();
  const jest_ = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(BASILI_TUTMA_MS)
    .onStart((olay) => {
      onBasla(indeks, olay.absoluteX);
    })
    .onUpdate((olay) => {
      onGuncelle(indeks, olay.translationX, olay.absoluteX);
    })
    .onEnd(() => {
      onBirak(indeks);
    });

  const stil = useAnimatedStyle(() => {
    if (aktif.value === -1) {
      return { transform: [{ translateX: 0 }, { scale: 1 }], zIndex: 0 };
    }
    if (aktif.value === indeks) {
      return { transform: [{ translateX: oteleme.value }, { scale: KALKIK_OLCEK }], zIndex: 2 };
    }
    // Aradaki kartlar bir kart boyu kayar -- suruklenenin biraktigi boslugu doldururlar.
    const sagdan = aktif.value < indeks && indeks <= hedef.value;
    const soldan = hedef.value <= indeks && indeks < aktif.value;
    const kayma = sagdan ? -sira : soldan ? sira : 0;
    return {
      transform: [{ translateX: withTiming(kayma, { duration: KAYMA_SURESI_MS }) }, { scale: 1 }],
      zIndex: 0,
    };
  });

  return (
    <GestureDetector gesture={jest_}>
      {/* Golge kartin KENDISINE degil bu sarmalayiciya verilir: kartin `overflow-hidden`i onu keserdi. */}
      <Animated.View style={kalkik ? [stil, golge] : stil}>{children}</Animated.View>
    </GestureDetector>
  );
}
