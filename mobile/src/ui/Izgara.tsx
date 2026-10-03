import Svg, { Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import { useRenkPaleti } from './renkler';

const ARALIK = 18;
const OPAKLIK = 0.05;
/** Solan izgarada merkez biraz daha belirgin: kenarlara dogru sifira inerken ortalama sabit izgaraya yakin kalsin. */
const SOLAN_MERKEZ_OPAKLIGI = 0.09;

interface Props {
  genislik: number;
  yukseklik: number;
  /**
   * #538: cizgiler ortada belirgin, kartin kenarlarina ve soldaki yaziya dogru silikleserek kaybolur.
   * Maske degil cizgi rengi olarak bir radyal gradyan kullanilir: renk `fg` token'indan gelir, iki
   * temada da dogru tonu verir (maske beyaz bir sabit renk isterdi).
   */
  solan?: boolean;
}

/** Sablon kartlarinda figurun arkasinda duran silik kare izgara (#439). */
export default function Izgara({ genislik, yukseklik, solan = false }: Props) {
  const palet = useRenkPaleti();
  const dikeyler = Array.from({ length: Math.floor(genislik / ARALIK) + 1 }, (_, i) => i * ARALIK);
  const yataylar = Array.from({ length: Math.floor(yukseklik / ARALIK) + 1 }, (_, i) => i * ARALIK);
  const cizgi = solan
    ? { stroke: 'url(#izgara-solma)' }
    : { stroke: palet.fg, strokeOpacity: OPAKLIK };

  return (
    <Svg width={genislik} height={yukseklik}>
      {solan && (
        <Defs>
          <RadialGradient
            id="izgara-solma"
            gradientUnits="userSpaceOnUse"
            cx={genislik / 2}
            cy={yukseklik / 2}
            rx={genislik / 2}
            ry={yukseklik / 2}
          >
            <Stop offset="0" stopColor={palet.fg} stopOpacity={SOLAN_MERKEZ_OPAKLIGI} />
            <Stop offset="1" stopColor={palet.fg} stopOpacity={0} />
          </RadialGradient>
        </Defs>
      )}
      {dikeyler.map((x) => (
        <Line key={`d${x}`} x1={x} y1={0} x2={x} y2={yukseklik} {...cizgi} />
      ))}
      {yataylar.map((y) => (
        <Line key={`y${y}`} x1={0} y1={y} x2={genislik} y2={y} {...cizgi} />
      ))}
    </Svg>
  );
}
