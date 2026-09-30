import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useRenkPaleti } from './renkler';

interface Props {
  testID: string;
  /** Dolu kisim, 0..1. `null` = karsilastirilacak bir sey yok: ray durur, dolmaz. */
  oran: number | null;
  /** Erisilebilirlik agacindaki deger (ekran okuyucu "3 / 8" okur). */
  deger?: { min: number; max: number; now: number };
  /** Rayin USTUNE, halkanin altina cizilen katman (#547: rekordaki serinin alevi). */
  children?: React.ReactNode;
}

const GENISLIK = 16;
/** Rayin ust/alt ucundan pay: halka ve parlamasi %0'da da %100'de de kartin icinde kalsin. */
const UC_PAYI = 8;
const RAY_KALINLIGI = 2.5;
const HALKA = 10;

/**
 * Ozet kartlarinin sagindaki dikey sayac (#544; #547'de Liquid Glass diliyle yeniden).
 *
 * #544'un ilk hali "kaba" bulundu (kullanici: "Apple'inki cok daha naif"): yuva simsiyah (`inset`),
 * ray 8 pt, halka kalin beyaz kenarli, dolgu tek duze turuncuydu. #547'de sadelesti (kullanici: "sade
 * ve sik"; Apple'in birebir kopyasi olmak zorunda degil) -- yuva ve uclardaki isaretler KALKTI:
 * - yalnizca ince (2.5 pt), soluk bir ray (`fg` %12);
 * - alttan yukari parlayan gradyan dolgu (`accent`, altta %35 -> ustte tam);
 * - 10 pt'lik ince kenarli halka, `accent` ile hafif parlar.
 *
 * Cizim SVG'de: ince cizgiler ve gradyan NativeWind siniflariyla kaba kaliyordu; yukseklik
 * `onLayout`tan gelir (yuva kartin boyunca uzanir).
 */
export default function DikeyCubuk({ testID, oran, deger, children }: Props) {
  const palet = useRenkPaleti();
  const [yukseklik, setYukseklik] = useState(0);

  const orta = GENISLIK / 2;
  const rayUst = UC_PAYI;
  const rayAlt = yukseklik - UC_PAYI;
  const halkaY = oran === null ? null : rayAlt - oran * (rayAlt - rayUst);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={deger}
      onLayout={(olay) => setYukseklik(olay.nativeEvent.layout.height)}
      className="self-stretch"
      style={{ width: GENISLIK }}
    >
      {yukseklik > 0 && (
        <Svg width={GENISLIK} height={yukseklik} pointerEvents="none">
          <Defs>
            <LinearGradient id={`${testID}-gradyan`} x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={palet.accent} stopOpacity={0.35} />
              <Stop offset="1" stopColor={palet.accent} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Line x1={orta} y1={rayUst} x2={orta} y2={rayAlt} stroke={palet.fg} strokeOpacity={0.12} strokeWidth={RAY_KALINLIGI} strokeLinecap="round" />
          {halkaY !== null && halkaY < rayAlt && (
            <Rect
              x={orta - RAY_KALINLIGI / 2}
              y={halkaY}
              width={RAY_KALINLIGI}
              height={rayAlt - halkaY}
              rx={RAY_KALINLIGI / 2}
              fill={`url(#${testID}-gradyan)`}
            />
          )}
        </Svg>
      )}
      {children}
      {halkaY !== null && (
        <View
          testID={`${testID}-dolu`}
          pointerEvents="none"
          className="absolute rounded-full border-fg bg-surface-2"
          style={{
            width: HALKA,
            height: HALKA,
            borderWidth: 1.5,
            left: (GENISLIK - HALKA) / 2,
            top: halkaY - HALKA / 2,
            shadowColor: palet.accent,
            shadowOpacity: 0.8,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      )}
    </View>
  );
}
