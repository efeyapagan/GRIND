import { useId, useRef } from 'react';
import { formatWeight } from '../lib/format';
import { eksenDegerleri } from '../lib/grafik';
import { useGenislik } from '../lib/useGenislik';

export interface CizgiNoktasi {
  etiket: string;
  deger: number;
}

interface Props {
  // Eskiden yeniye.
  noktalar: CizgiNoktasi[];
  // Gizli listede degerin yanina yazilir ("kg").
  birim: string;
  // SVG'nin erisilebilir adi.
  baslik: string;
}

const YUKSEKLIK = 220;
const UST_BOSLUK = 40;
const ALT_BOSLUK = 28;
const SOL_BOSLUK = 16;
const SAG_BOSLUK = 48;
const VARSAYILAN_GENISLIK = 320;
const ETIKET_YUKSEKLIGI = 22;

/**
 * Veri bilmeyen cizgi grafik (dilim 3 spec Karar 4): hareket, oturum ya da API bilmez. Cizgi, noktalar
 * ve alan degradesi `accent-fg` (acik-tema spec Karar 3 -- accent bir CIZGI/CURRENTCOLOR olarak
 * kullanildiginda foreground sayilir, acik temada 2.7:1'e dusuyordu; `text-accent-fg` + `currentColor`).
 * Deger etiketi PILL'i ise `fill-accent` + `fill-on-accent` metinle kalir (dolgu + uzerindeki metin,
 * 4.54:1 -- degismedi). Izgara ve eksen metni notr. Ayni veri ekran okuyucuya gizli bir listeyle
 * verilir. Bos girdide `null`.
 */
export default function CizgiGrafik({ noktalar, birim, baslik }: Props) {
  if (noktalar.length === 0) {
    return null;
  }
  // Olcum hook'u yalnizca veri varken monte edilen ic bilesende: bos durumdan veriye gecildiginde
  // ref'in bagli oldugu eleman yeniden olusur ve olcum yeniden baslar.
  return <Cizim noktalar={noktalar} birim={birim} baslik={baslik} />;
}

function Cizim({ noktalar, birim, baslik }: Props) {
  const kapRef = useRef<HTMLDivElement>(null);
  const genislik = useGenislik(kapRef, VARSAYILAN_GENISLIK);
  // useId ":" / "«" gibi karakterler uretebilir; url(#...) icinde guvenli olsun diye temizlenir.
  const degradeId = `degrade-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const degerler = noktalar.map((nokta) => nokta.deger);
  const eksen = eksenDegerleri(Math.min(...degerler), Math.max(...degerler));
  const altDeger = eksen[0];
  const ustDeger = eksen[eksen.length - 1];
  const cizimGenisligi = Math.max(genislik - SOL_BOSLUK - SAG_BOSLUK, 1);
  const cizimYuksekligi = YUKSEKLIK - UST_BOSLUK - ALT_BOSLUK;
  const tabanY = UST_BOSLUK + cizimYuksekligi;

  const xKonumu = (sira: number) =>
    SOL_BOSLUK + (noktalar.length === 1 ? cizimGenisligi / 2 : (sira * cizimGenisligi) / (noktalar.length - 1));
  const yKonumu = (deger: number) =>
    UST_BOSLUK + cizimYuksekligi - ((deger - altDeger) / (ustDeger - altDeger)) * cizimYuksekligi;

  const koordinatlar = noktalar.map((nokta, sira) => ({ x: xKonumu(sira), y: yKonumu(nokta.deger) }));
  const cizgi = koordinatlar.map((k, sira) => `${sira === 0 ? 'M' : 'L'}${k.x},${k.y}`).join(' ');
  const ilk = koordinatlar[0];
  const son = koordinatlar[koordinatlar.length - 1];
  const alan = `${cizgi} L${son.x},${tabanY} L${ilk.x},${tabanY} Z`;

  const etiketliSiralar = noktalar.length === 1 ? [0] : [0, noktalar.length - 1];
  const tarihSiralari = [...new Set([0, Math.floor((noktalar.length - 1) / 2), noktalar.length - 1])];

  return (
    <div ref={kapRef} className="w-full">
      <svg role="img" aria-label={baslik} width={genislik} height={YUKSEKLIK} className="block text-accent-fg">
        <defs>
          <linearGradient id={degradeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.45} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <g aria-hidden>
          {eksen.map((deger) => (
            <g key={deger}>
              <line
                x1={SOL_BOSLUK}
                x2={SOL_BOSLUK + cizimGenisligi}
                y1={yKonumu(deger)}
                y2={yKonumu(deger)}
                strokeWidth={1}
                className="stroke-surface-3"
              />
              <text
                x={genislik - 4}
                y={yKonumu(deger)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted text-label tabular-nums"
              >
                {formatWeight(deger)}
              </text>
            </g>
          ))}
          {tarihSiralari.map((sira, index) => {
            // M2 (review bulgusu): tek etiket ORTALI kalir; birden fazla etiket varken ILK etiket
            // SVG'nin sol kenarindan, SON etiket sag kenarindan tasmasin diye sirasiyla "start" ve
            // "end" hizalanir (aradaki -- varsa -- "middle" kalir).
            const sonIndeks = tarihSiralari.length - 1;
            const hizalama: 'start' | 'middle' | 'end' =
              tarihSiralari.length === 1 ? 'middle' : index === 0 ? 'start' : index === sonIndeks ? 'end' : 'middle';
            return (
              <text
                key={`tarih-${sira}`}
                x={xKonumu(sira)}
                y={YUKSEKLIK - 6}
                textAnchor={hizalama}
                className="fill-muted text-label"
              >
                {noktalar[sira].etiket}
              </text>
            );
          })}
          {noktalar.length > 1 && <path d={alan} fill={`url(#${degradeId})`} />}
          {noktalar.length > 1 && (
            <path d={cizgi} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" />
          )}
          {koordinatlar.map((k, sira) => (
            <circle
              key={`nokta-${sira}`}
              cx={k.x}
              cy={k.y}
              r={5}
              stroke="currentColor"
              strokeWidth={2.5}
              className="fill-bg"
            />
          ))}
          {etiketliSiralar.map((sira) => {
            const metin = formatWeight(noktalar[sira].deger);
            const etiketGenisligi = metin.length * 8 + 16;
            const merkezX = Math.min(
              Math.max(koordinatlar[sira].x, etiketGenisligi / 2),
              genislik - etiketGenisligi / 2,
            );
            const ustY = Math.max(koordinatlar[sira].y - ETIKET_YUKSEKLIGI - 10, 0);
            return (
              <g key={`etiket-${sira}`}>
                <rect
                  x={merkezX - etiketGenisligi / 2}
                  y={ustY}
                  width={etiketGenisligi}
                  height={ETIKET_YUKSEKLIGI}
                  rx={6}
                  className="fill-accent"
                />
                <text
                  x={merkezX}
                  y={ustY + ETIKET_YUKSEKLIGI / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-on-accent text-label tabular-nums"
                >
                  {metin}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <ul className="sr-only">
        {noktalar.map((nokta, sira) => (
          <li key={`${nokta.etiket}-${sira}`}>{`${nokta.etiket}: ${formatWeight(nokta.deger)} ${birim}`}</li>
        ))}
      </ul>
    </div>
  );
}
