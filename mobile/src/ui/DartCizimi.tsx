import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useRenkPaleti } from './renkler';

/** Okun en-boy orani (genislik : yukseklik); cizim yukari bakar, ucu kutunun ust ortasindadir. */
export const OK_ORANI = 8 / 24;

/**
 * Haftalik hedef tuttugunda hedef cubugunun tepesinde halkanin yerini alan dart tahtasi (#547,
 * kullanici karari). Ic ice halkalar: koyu kizil ve acik kehribar seritler (alevle ayni ates tonlari),
 * ince isinsal dilim cizgileri, yesil bir gobek ve kizil bir merkez. Kare bir kutuya cizilir.
 */
export function DartTahtasi({ boyut }: { boyut: number }) {
  const palet = useRenkPaleti();
  const dilimler = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);

  return (
    <Svg width={boyut} height={boyut} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={11.5} fill={palet['alev-dip']} />
      <Circle cx={12} cy={12} r={9.2} fill={palet['alev-acik']} />
      <Circle cx={12} cy={12} r={7} fill={palet['alev-dip']} />
      <Circle cx={12} cy={12} r={4.8} fill={palet['alev-acik']} />
      {dilimler.map((aci) => (
        <Line
          key={aci}
          x1={12 + Math.cos(aci) * 2.8}
          y1={12 + Math.sin(aci) * 2.8}
          x2={12 + Math.cos(aci) * 11.5}
          y2={12 + Math.sin(aci) * 11.5}
          stroke={palet.fg}
          strokeOpacity={0.18}
          strokeWidth={0.4}
        />
      ))}
      <Circle cx={12} cy={12} r={2.8} fill={palet.success} />
      <Circle cx={12} cy={12} r={1.3} fill={palet['alev-dip']} />
      <Circle cx={12} cy={12} r={11.5} fill="none" stroke={palet.fg} strokeOpacity={0.2} strokeWidth={0.6} />
    </Svg>
  );
}

/**
 * Dart oku (#547): yukari bakar -- celik renkli uc (`fg`), koyu kizil namlu, ince govde, turuncu
 * tuyler. Ucu kutunun ust ortasinda: saplanma noktasina ucundan hizalanir.
 */
export function OkCizimi({ genislik }: { genislik: number }) {
  const palet = useRenkPaleti();
  return (
    <Svg width={genislik} height={genislik / OK_ORANI} viewBox="0 0 8 24">
      <Path d="M4 0 L5.1 5 L2.9 5 Z" fill={palet.fg} />
      <Rect x={2.6} y={5} width={2.8} height={6} rx={1} fill={palet['alev-dip']} />
      <Rect x={3.5} y={11} width={1} height={6} fill={palet.fg} fillOpacity={0.6} />
      <Path d="M4 16 L7.8 23.5 L4 21.5 L0.2 23.5 Z" fill={palet.accent} />
      <Line x1={4} y1={16} x2={4} y2={21.5} stroke={palet['alev-dip']} strokeWidth={0.6} />
    </Svg>
  );
}
