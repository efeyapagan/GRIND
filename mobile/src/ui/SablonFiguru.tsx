import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G, Line, Path, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { EgzersizKategorisi } from '@grind/shared/api/queries';
import { figurPozu } from './figurPozu';
import { useCevrimdisi } from '../baglanti/BaglantiSaglayici';
import { useRenkPaleti } from './renkler';

/** Figurun cok hafif bulanikligi (viewBox birimi; 112 px'lik figurde ~1,5 px). */
const BULANIKLIK = 1.3;

const AnimasyonluPath = Animated.createAnimatedComponent(Path);
const AnimasyonluLine = Animated.createAnimatedComponent(Line);
const AnimasyonluRect = Animated.createAnimatedComponent(Rect);
const AnimasyonluCircle = Animated.createAnimatedComponent(Circle);

/** #474: bir inis ya da kalkis; ardindan geri doner (`withRepeat` ters yonde tekrarlar). */
const YARIM_TUR_MS = 1400;

/**
 * #474: figurun parcalari; her biri kendi ozelliklerini her karede pozdan okur (UI thread'de).
 * Hook sayisi kategoriden bagimsiz sabit kalsin diye hepsi her zaman hesaplanir; bari ya da dambili
 * olmayan figurde o parca cizilmez.
 *
 * #604: poz kare basina BIR kez hesaplanir (`useDerivedValue`); parcalar onu okur. Kasli siluet tek bir
 * dolu yoldur (`govde`), cizgi kalinligi yok.
 */
function Figur({ kategori, p }: { kategori: EgzersizKategorisi; p: SharedValue<number> }) {
  const baslangic = figurPozu(kategori, 0);
  const poz = useDerivedValue(() => figurPozu(kategori, p.value));

  const barProps = useAnimatedProps(() => {
    const bar = poz.value.bar;
    return bar ? { x1: bar.x1, x2: bar.x2, y1: bar.y, y2: bar.y } : {};
  });
  const solPlakaProps = useAnimatedProps(() => {
    const bar = poz.value.bar;
    return bar ? { x: bar.x1 + 2, y: bar.y - 10 } : {};
  });
  const sagPlakaProps = useAnimatedProps(() => {
    const bar = poz.value.bar;
    return bar ? { x: bar.x2 - 8, y: bar.y - 10 } : {};
  });
  const basProps = useAnimatedProps(() => ({ cx: poz.value.bas.x, cy: poz.value.bas.y }));
  const govdeProps = useAnimatedProps(() => ({ d: poz.value.govde }));
  const solDambilProps = useAnimatedProps(() => {
    const dambil = poz.value.agirliklar[0];
    return dambil ? { x: dambil.x - 8, y: dambil.y - 3 } : {};
  });
  const sagDambilProps = useAnimatedProps(() => {
    const dambil = poz.value.agirliklar[1];
    return dambil ? { x: dambil.x - 8, y: dambil.y - 3 } : {};
  });

  return (
    <>
      {baslangic.bar && (
        <>
          <AnimasyonluLine animatedProps={barProps} strokeWidth={4} strokeLinecap="round" />
          {baslangic.bar.plakali && (
            <>
              <AnimasyonluRect animatedProps={solPlakaProps} width={6} height={20} rx={2} strokeWidth={0} />
              <AnimasyonluRect animatedProps={sagPlakaProps} width={6} height={20} rx={2} strokeWidth={0} />
            </>
          )}
        </>
      )}
      {/* #604: kasli silueti oranli gostermek icin bas eskisinden (8) biraz kucuk. */}
      <AnimasyonluCircle animatedProps={basProps} r={7} strokeWidth={0} />
      <AnimasyonluPath animatedProps={govdeProps} strokeWidth={0} />
      {baslangic.agirliklar.length > 0 && (
        <>
          <AnimasyonluRect animatedProps={solDambilProps} width={16} height={6} rx={2} strokeWidth={0} />
          <AnimasyonluRect animatedProps={sagDambilProps} width={16} height={6} rx={2} strokeWidth={0} />
        </>
      )}
    </>
  );
}

/**
 * #439: sablon kartinin arkasindaki silik sporcu figuru (#604'ten beri kasli siluet); sablonun baskin kategorisine gore secilir.
 * Referanstaki gibi cok hafif bulanik cizilir: arka planda kalsin, metinle yarismasin.
 * Saf dekorasyon: dokunmayi yutmaz, erisilebilirlik agacina girmez. Renk `fg`, dusuk opaklikla --
 * iki temada da zeminden hafifce ayrilir, metnin okunurlugunu bozmaz.
 *
 * #474: figur durmaksizin kendi hareketini yapar (Push overhead press, Pull barfiks, Legs squat, Other
 * sirayla curl); pozlar `figurPozu`nda. Cihazda "hareketi azalt" aciksa baslangic karesinde -- #439'daki
 * sabit cizimde -- durur.
 *
 * #556 (kullanici bildirdi: cok sayida sablonla kasma): `canli=false` ayni sekilde baslangic
 * karesinde durur -- cagiran taraf, bu figurun ekranda gorunmedigini/gorunmeyecegini bildigi zaman
 * (ornegin Kaydedilenler listesinde gorunum disina dusmesi beklenen kartlar) animasyonu hic
 * baslatmaz. Sablon sayisi arttikca eszamanli calisan animasyon sayisi boylece sabit kalir.
 *
 * #174 (kullanici karari): cevrimdisiyken de ayni sekilde baslangic karesinde durur.
 */
export default function SablonFiguru({
  kategori,
  boyut,
  canli = true,
}: {
  kategori: EgzersizKategorisi;
  boyut: number;
  canli?: boolean;
}) {
  const palet = useRenkPaleti();
  const hareketiAzalt = useReducedMotion();
  // #174 (kullanici karari): cevrimdisiyken figurler oynamaz, baslangic karesinde durur.
  const cevrimdisi = useCevrimdisi();
  const p = useSharedValue(0);

  useEffect(() => {
    if (hareketiAzalt || !canli || cevrimdisi) {
      p.value = 0;
      return;
    }
    p.value = withRepeat(withTiming(1, { duration: YARIM_TUR_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(p);
  }, [hareketiAzalt, canli, cevrimdisi, p]);

  // useId ':' gibi karakterler uretir; `url(#...)` icinde gecersiz oldugu icin temizlenir (Parilti ile ayni).
  const filtreId = `figur${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      testID={`sablon-figuru-${kategori}`}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={boyut} height={boyut} viewBox="0 0 100 100">
        <Defs>
          <Filter id={filtreId}>
            <FeGaussianBlur stdDeviation={BULANIKLIK} />
          </Filter>
        </Defs>
        <G stroke={palet.fg} fill={palet.fg} opacity={0.22} filter={`url(#${filtreId})`}>
          <Figur kategori={kategori} p={p} />
        </G>
      </Svg>
    </View>
  );
}
