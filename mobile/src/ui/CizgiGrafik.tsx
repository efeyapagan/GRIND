import { useState } from 'react';
import { View, Text, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Path, Circle, Rect, Text as SvgText, G } from 'react-native-svg';
import { formatWeight } from '@grind/shared/lib/format';
import { eksenDegerleri } from '@grind/shared/lib/grafik';
import { renkler } from '@grind/shared/designTokens';

export interface CizgiNoktasi {
  etiket: string;
  deger: number;
}

interface Props {
  noktalar: CizgiNoktasi[];
  birim: string;
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
 * web/src/ui/CizgiGrafik.tsx ile ayni cizim mantigi -- react-native-svg SVG primitifleri
 * DOM'un SVG'siyle neredeyse birebir ayni (Path/Line/Circle/Rect/Text). Genislik olcumu
 * ResizeObserver yerine `onLayout` ile yapilir (web'deki `useGenislik` hook'unun RN karsiligi).
 */
export default function CizgiGrafik({ noktalar, birim, baslik }: Props) {
  if (noktalar.length === 0) {
    return null;
  }
  return <Cizim noktalar={noktalar} birim={birim} baslik={baslik} />;
}

function Cizim({ noktalar, baslik }: Props) {
  const [genislik, setGenislik] = useState(VARSAYILAN_GENISLIK);

  function olcumAl(olay: LayoutChangeEvent) {
    const yeniGenislik = olay.nativeEvent.layout.width;
    if (yeniGenislik > 0) {
      setGenislik(yeniGenislik);
    }
  }

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
    <View onLayout={olcumAl} className="w-full">
      <Svg accessibilityLabel={baslik} width={genislik} height={YUKSEKLIK}>
        <Defs>
          <LinearGradient id="degrade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={renkler.accent} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={renkler.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <G>
          {eksen.map((deger) => (
            <G key={deger}>
              <Line
                x1={SOL_BOSLUK}
                x2={SOL_BOSLUK + cizimGenisligi}
                y1={yKonumu(deger)}
                y2={yKonumu(deger)}
                strokeWidth={1}
                stroke={renkler['surface-3']}
              />
              <SvgText
                x={genislik - 4}
                y={yKonumu(deger)}
                textAnchor="end"
                alignmentBaseline="middle"
                fill={renkler.muted}
                fontSize={12}
              >
                {formatWeight(deger)}
              </SvgText>
            </G>
          ))}
          {tarihSiralari.map((sira, index) => {
            const sonIndeks = tarihSiralari.length - 1;
            const hizalama: 'start' | 'middle' | 'end' =
              tarihSiralari.length === 1 ? 'middle' : index === 0 ? 'start' : index === sonIndeks ? 'end' : 'middle';
            return (
              <SvgText
                key={`tarih-${sira}`}
                x={xKonumu(sira)}
                y={YUKSEKLIK - 6}
                textAnchor={hizalama}
                fill={renkler.muted}
                fontSize={12}
              >
                {noktalar[sira].etiket}
              </SvgText>
            );
          })}
          {noktalar.length > 1 && <Path d={alan} fill="url(#degrade)" />}
          {noktalar.length > 1 && (
            <Path d={cizgi} fill="none" stroke={renkler.accent} strokeWidth={2.5} strokeLinejoin="round" />
          )}
          {koordinatlar.map((k, sira) => (
            <Circle key={`nokta-${sira}`} cx={k.x} cy={k.y} r={5} stroke={renkler.accent} strokeWidth={2.5} fill={renkler.bg} />
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
              <G key={`etiket-${sira}`}>
                <Rect
                  x={merkezX - etiketGenisligi / 2}
                  y={ustY}
                  width={etiketGenisligi}
                  height={ETIKET_YUKSEKLIGI}
                  rx={6}
                  fill={renkler.accent}
                />
                <SvgText
                  x={merkezX}
                  y={ustY + ETIKET_YUKSEKLIGI / 2}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fill={renkler['on-accent']}
                  fontSize={12}
                >
                  {metin}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}
