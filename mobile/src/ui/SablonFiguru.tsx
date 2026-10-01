import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G, Line, Path, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { EgzersizKategorisi } from '@grind/shared/api/queries';
import { figurPozu } from './figurPozu';
import { useRenkPaleti } from './renkler';

const CIZGI = 8;
/** Figurun cok hafif bulanikligi (viewBox birimi; 112 px'lik figurde ~1,5 px). */
const BULANIKLIK = 1.3;

const AnimasyonluPath = Animated.createAnimatedComponent(Path);
const AnimasyonluLine = Animated.createAnimatedComponent(Line);
const AnimasyonluRect = Animated.createAnimatedComponent(Rect);
const AnimasyonluCircle = Animated.createAnimatedComponent(Circle);

/** #474: bir inis ya da kalkis; ardindan geri doner (`withRepeat` ters yonde tekrarlar). */
const YARIM_TUR_MS = 1400;

/**
 * #474: figurun parcalari; her biri kendi ozelliklerini her karede `figurPozu`ndan okur (UI thread'de).
 * Hook sayisi kategoriden bagimsiz sabit kalsin diye hepsi her zaman hesaplanir; bari ya da dambili
 * olmayan figurde o parca cizilmez.
 */
function Figur({ kategori, p }: { kategori: EgzersizKategorisi; p: SharedValue<number> }) {
  const baslangic = figurPozu(kategori, 0);

  const barProps = useAnimatedProps(() => {
    const bar = figurPozu(kategori, p.value).bar;
    return bar ? { x1: bar.x1, x2: bar.x2, y1: bar.y, y2: bar.y } : {};
  });
  const solPlakaProps = useAnimatedProps(() => {
    const bar = figurPozu(kategori, p.value).bar;
    return bar ? { x: bar.x1 + 2, y: bar.y - 10 } : {};
  });
  const sagPlakaProps = useAnimatedProps(() => {
    const bar = figurPozu(kategori, p.value).bar;
    return bar ? { x: bar.x2 - 8, y: bar.y - 10 } : {};
  });
  const basProps = useAnimatedProps(() => {
    const bas = figurPozu(kategori, p.value).bas;
    return { cx: bas.x, cy: bas.y };
  });
  const govdeProps = useAnimatedProps(() => ({ d: figurPozu(kategori, p.value).govde }));
  const kollarProps = useAnimatedProps(() => ({ d: figurPozu(kategori, p.value).kollar }));
  const solDambilProps = useAnimatedProps(() => {
    const dambil = figurPozu(kategori, p.value).agirliklar[0];
    return dambil ? { x: dambil.x - 8, y: dambil.y - 3 } : {};
  });
  const sagDambilProps = useAnimatedProps(() => {
    const dambil = figurPozu(kategori, p.value).agirliklar[1];
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
      <AnimasyonluCircle animatedProps={basProps} r={8} strokeWidth={0} />
      {/* Govde parcalari ayni kalin, yuvarlak uclu cizgi -- piktogram gorunumu. */}
      <AnimasyonluPath animatedProps={govdeProps} strokeWidth={CIZGI} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <AnimasyonluPath animatedProps={kollarProps} strokeWidth={CIZGI} strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
 * #439: sablon kartinin arkasindaki silik sporcu figuru; sablonun baskin kategorisine gore secilir.
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
  const p = useSharedValue(0);

  useEffect(() => {
    if (hareketiAzalt || !canli) {
      p.value = 0;
      return;
    }
    p.value = withRepeat(withTiming(1, { duration: YARIM_TUR_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(p);
  }, [hareketiAzalt, canli, p]);

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
