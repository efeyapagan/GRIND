import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G, Line, Path, Rect } from 'react-native-svg';
import type { EgzersizKategorisi } from '@grind/shared/api/queries';
import { useRenkPaleti } from './renkler';

const CIZGI = 8;
/** Figurun cok hafif bulanikligi (viewBox birimi; 112 px'lik figurde ~1,5 px). */
const BULANIKLIK = 1.3;

/** Govde parcalari ayni kalin, yuvarlak uclu cizgi -- piktogram gorunumu. */
function Uzuv({ d }: { d: string }) {
  return <Path d={d} strokeWidth={CIZGI} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
}

/** Iki ucunda plaka olan bar; `y` barin ekseni. */
function Bar({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <>
      <Line x1={x1} y1={y} x2={x2} y2={y} strokeWidth={4} strokeLinecap="round" />
      <Rect x={x1 + 2} y={y - 10} width={6} height={20} rx={2} strokeWidth={0} />
      <Rect x={x2 - 8} y={y - 10} width={6} height={20} rx={2} strokeWidth={0} />
    </>
  );
}

/** Push: bari basin ustune iten sporcu. */
function Itis() {
  return (
    <>
      <Bar x1={10} x2={90} y={14} />
      <Circle cx={50} cy={32} r={8} strokeWidth={0} />
      <Uzuv d="M50 44 L50 70 M50 70 L40 96 M50 70 L60 96" />
      <Uzuv d="M44 46 L32 32 L32 14 M56 46 L68 32 L68 14" />
    </>
  );
}

/** Pull: barfiks cekmis sporcu, dizler bukuk. */
function Cekis() {
  return (
    <>
      <Line x1={12} y1={8} x2={88} y2={8} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={50} cy={24} r={8} strokeWidth={0} />
      <Uzuv d="M44 38 L32 28 L34 8 M56 38 L68 28 L66 8" />
      <Uzuv d="M50 36 L50 64 M50 64 L42 80 L48 94 M50 64 L58 80 L64 92" />
    </>
  );
}

/** Legs: bar sirtinda, cokmus squat -- yandan. */
function Squat() {
  return (
    <>
      <Bar x1={22} x2={86} y={30} />
      <Circle cx={60} cy={16} r={8} strokeWidth={0} />
      <Uzuv d="M56 30 L40 60 M40 60 L64 66 L58 94" />
      <Uzuv d="M52 36 L46 30" />
    </>
  );
}

/** Other: iki elinde dambil, biri kivrilmis (curl). */
function Dambil() {
  return (
    <>
      <Circle cx={50} cy={16} r={8} strokeWidth={0} />
      <Uzuv d="M50 28 L50 62 M50 62 L42 94 M50 62 L58 94" />
      <Uzuv d="M46 32 L36 50 L28 36 M54 32 L62 50 L64 64" />
      <Rect x={20} y={30} width={16} height={6} rx={2} strokeWidth={0} />
      <Rect x={56} y={64} width={16} height={6} rx={2} strokeWidth={0} />
    </>
  );
}

const FIGURLER: Record<EgzersizKategorisi, () => React.JSX.Element> = {
  Push: Itis,
  Pull: Cekis,
  Legs: Squat,
  Other: Dambil,
};

/**
 * #439: sablon kartinin arkasindaki silik sporcu figuru; sablonun baskin kategorisine gore secilir.
 * Referanstaki gibi cok hafif bulanik cizilir: arka planda kalsin, metinle yarismasin.
 * Saf dekorasyon: dokunmayi yutmaz, erisilebilirlik agacina girmez. Renk `fg`, dusuk opaklikla --
 * iki temada da zeminden hafifce ayrilir, metnin okunurlugunu bozmaz.
 */
export default function SablonFiguru({ kategori, boyut }: { kategori: EgzersizKategorisi; boyut: number }) {
  const palet = useRenkPaleti();
  const Figur = FIGURLER[kategori];
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
          <Figur />
        </G>
      </Svg>
    </View>
  );
}
