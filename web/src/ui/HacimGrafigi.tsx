import { formatWeight } from '../lib/format';

export interface GrafikNoktasi {
  etiket: string;
  deger: number;
  vurgulu?: boolean;
}

interface Props {
  noktalar: GrafikNoktasi[];
  // SVG'nin erisilebilir ozet adi (ör. "Bench Press hacmi, son 6 antrenman").
  baslik: string;
}

// viewBox birimleri: her nokta ADIM genisliginde bir yuva, cubuk yuvanin ortasinda.
const YUKSEKLIK = 100;
const ADIM = 10;
const CUBUK = 6;
const EN_KISA_CUBUK = 2;

/**
 * Veri bilmeyen cubuk grafik (spec Karar 9): hareket, oturum ya da API bilmez; bugun Bugun ekraninda,
 * ileride Rekorlar/istatistik ekranlarinda aynen kullanilir. Kutuphane YOK, elle SVG.
 *
 * Yatayda yayilmak icin `preserveAspectRatio="none"` kullanilir; bu metni bozacagi icin etiketler
 * SVG'nin DISINDA, ayni yuva genisliginde (`flex-1`) HTML satirlaridir. Renkler: cubuk `surface-4`,
 * vurgulu (bugun) `fg`; accent KULLANILMAZ. Ayni veri ekran okuyucuya gizli bir listeyle verilir.
 */
export default function HacimGrafigi({ noktalar, baslik }: Props) {
  const enBuyuk = Math.max(0, ...noktalar.map((nokta) => nokta.deger));
  const enBuyukSira = enBuyuk > 0 ? noktalar.findIndex((nokta) => nokta.deger === enBuyuk) : -1;

  return (
    <figure className="flex flex-col gap-1">
      <div aria-hidden className="flex">
        {noktalar.map((nokta, sira) => (
          <span
            key={`${nokta.etiket}-${sira}`}
            className="min-w-0 flex-1 text-center text-label-xs whitespace-nowrap text-muted tabular-nums"
          >
            {sira === enBuyukSira ? `${formatWeight(nokta.deger)} kg` : ''}
          </span>
        ))}
      </div>
      <svg
        role="img"
        aria-label={baslik}
        viewBox={`0 0 ${noktalar.length * ADIM} ${YUKSEKLIK}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
      >
        {noktalar.map((nokta, sira) => {
          const yukseklik =
            enBuyuk > 0 ? Math.max(EN_KISA_CUBUK, (nokta.deger / enBuyuk) * YUKSEKLIK) : EN_KISA_CUBUK;
          return (
            <rect
              key={`${nokta.etiket}-${sira}`}
              x={sira * ADIM + (ADIM - CUBUK) / 2}
              y={YUKSEKLIK - yukseklik}
              width={CUBUK}
              height={yukseklik}
              rx={1}
              className={nokta.vurgulu ? 'fill-fg' : 'fill-surface-4'}
            />
          );
        })}
      </svg>
      <div aria-hidden className="flex">
        {noktalar.map((nokta, sira) => (
          <span
            key={`${nokta.etiket}-${sira}`}
            className={`min-w-0 flex-1 text-center text-label-xs whitespace-nowrap ${nokta.vurgulu ? 'text-fg' : 'text-muted'}`}
          >
            {nokta.etiket}
          </span>
        ))}
      </div>
      <ul className="sr-only">
        {noktalar.map((nokta, sira) => (
          <li key={`${nokta.etiket}-${sira}`}>
            {nokta.etiket}: {formatWeight(nokta.deger)} kg
          </li>
        ))}
      </ul>
    </figure>
  );
}
