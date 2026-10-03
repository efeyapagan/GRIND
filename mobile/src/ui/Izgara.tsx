import Svg, { Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import { useRenkPaleti } from './renkler';

const ARALIK = 18;
/** Ortadaki duz bolgenin opakligi: kenara dogru sifira inerken ortalama eski sabit %5'lik izgaraya yakin kalsin. */
const MERKEZ_OPAKLIGI = 0.07;
/**
 * #604 (kullanici): solma merkezden hemen baslamasin -- izgara yaricapin bu oranina kadar tam
 * belirgin kalir, ancak ondan sonra kenara dogru kaybolur.
 */
const SOLMA_BASLANGICI = 0.72;

interface Props {
  genislik: number;
  yukseklik: number;
}

/**
 * Sablon kartlarinda figurun arkasinda duran silik kare izgara (#439). Cizgiler ortada belirgin, kartin
 * kenarlarina ve yaziya dogru silikleserek kaybolur (#538; #604'ten beri vitrin ve kaydedilen kartta
 * ayni kural, tek bilesen). Maske degil cizgi rengi olarak bir radyal gradyan kullanilir: renk `fg`
 * token'indan gelir, iki temada da dogru tonu verir (maske beyaz bir sabit renk isterdi).
 */
export default function Izgara({ genislik, yukseklik }: Props) {
  const palet = useRenkPaleti();
  const dikeyler = Array.from({ length: Math.floor(genislik / ARALIK) + 1 }, (_, i) => i * ARALIK);
  const yataylar = Array.from({ length: Math.floor(yukseklik / ARALIK) + 1 }, (_, i) => i * ARALIK);
  const cizgi = { stroke: 'url(#izgara-solma)' };

  return (
    <Svg width={genislik} height={yukseklik}>
      <Defs>
        <RadialGradient
          id="izgara-solma"
          gradientUnits="userSpaceOnUse"
          cx={genislik / 2}
          cy={yukseklik / 2}
          rx={genislik / 2}
          ry={yukseklik / 2}
        >
          <Stop offset="0" stopColor={palet.fg} stopOpacity={MERKEZ_OPAKLIGI} />
          <Stop offset={SOLMA_BASLANGICI} stopColor={palet.fg} stopOpacity={MERKEZ_OPAKLIGI} />
          <Stop offset="1" stopColor={palet.fg} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {dikeyler.map((x) => (
        <Line key={`d${x}`} x1={x} y1={0} x2={x} y2={yukseklik} {...cizgi} />
      ))}
      {yataylar.map((y) => (
        <Line key={`y${y}`} x1={0} y1={y} x2={genislik} y2={y} {...cizgi} />
      ))}
    </Svg>
  );
}
