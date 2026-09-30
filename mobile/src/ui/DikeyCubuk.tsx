import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import AlevCizimi, { ALEV_ORANI, KivilcimCizimi } from './AlevCizimi';
import { DartTahtasi, OK_ORANI, OkCizimi } from './DartCizimi';
import { acilistaIlkKezMi } from './acilisAnimasyonu';
import { useRenkPaleti } from './renkler';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface Props {
  testID: string;
  /** Dolu kisim, 0..1. `null` = karsilastirilacak bir sey yok: ray durur, dolmaz. */
  oran: number | null;
  /** Erisilebilirlik agacindaki deger (ekran okuyucu "3 / 8" okur). */
  deger?: { min: number; max: number; now: number };
  /**
   * #547: dolgunun ucundaki isaret. `halka` (varsayilan); `alev` rekordaki seri -- uygulamanin ilk
   * acilisinda cubugun dibinden yerine tirmanir, dolgu da onunla yukselir, dipten kivilcimlar firlar;
   * `dart` tutulan haftalik hedef -- ilk acilista cubugun dibinden 5 ok atilip tahtanin tam ortasina
   * saplanir, sonra tahtada tek ok kalir. Iki animasyon da uygulama SURECI basina bir kez.
   */
  isaret?: 'halka' | 'alev' | 'dart';
}

const GENISLIK = 16;
/** Rayin ust/alt ucundan pay: halka ve parlamasi %0'da da %100'de de kartin icinde kalsin. */
const UC_PAYI = 8;
const RAY_KALINLIGI = 2.5;
const HALKA = 10;
const ALEV_GENISLIK = 16;
const ALEV_YUKSEKLIK = ALEV_GENISLIK / ALEV_ORANI;
/** Alevin kutusunun bu orani dolgunun ucunun USTUNDE kalir: alev dolgunun ucunda "yanar". */
const ALEV_TABANI = 0.65;
const HAREKET = { reduceMotion: ReduceMotion.System } as const;

const TAHTA = 22;
const OK_GENISLIK = 7;
const OK_YUKSEKLIK = OK_GENISLIK / OK_ORANI;
const OK_SAYISI = 5;
/** Oklar arasi gecikme ve bir okun ucus suresi (ms). */
const OK_ARALIGI = 260;
const OK_UCUS = 420;
/** Saplanmis okun egimi: ucu tahtaya, tuyleri sag alta. */
const OK_ACISI = -30;
/** Tahtanin her isabette hafifce sarsilmasi. */
const SARSINTI = 190;

/**
 * Tirmanista cubugun dibinden firlayan kivilcimlar (#547, kullanici karari: "daha cafcafli patlasin,
 * daha buyuk olabilir"). Iki dalga: ilki acilis aninda dipten iki yana birden patlar, ikincisi alevin
 * pesinden gelir. `yukselis` cubugun boyunun ne kadarina cikacagi, `dx` yana savrulmasi (kartin kenarina
 * tasmasin diye en fazla 12 pt).
 */
const KIVILCIMLAR = [
  { gecikme: 0, dx: -12, yukselis: 0.45, tur: 'kivilcim', boyut: 10 },
  { gecikme: 0, dx: 11, yukselis: 0.5, tur: 'kivilcim', boyut: 9 },
  { gecikme: 60, dx: -5, yukselis: 0.65, tur: 'alev', boyut: 10 },
  { gecikme: 80, dx: 7, yukselis: 0.7, tur: 'alev', boyut: 9 },
  { gecikme: 160, dx: -12, yukselis: 0.35, tur: 'kivilcim', boyut: 8 },
  { gecikme: 200, dx: 12, yukselis: 0.4, tur: 'kivilcim', boyut: 8 },
  { gecikme: 320, dx: -3, yukselis: 0.85, tur: 'kivilcim', boyut: 11 },
  { gecikme: 420, dx: 9, yukselis: 0.75, tur: 'alev', boyut: 8 },
  { gecikme: 520, dx: -9, yukselis: 0.8, tur: 'kivilcim', boyut: 9 },
  { gecikme: 640, dx: 4, yukselis: 0.95, tur: 'kivilcim', boyut: 10 },
  { gecikme: 760, dx: -6, yukselis: 0.9, tur: 'alev', boyut: 8 },
] as const;

type KivilcimAyari = (typeof KIVILCIMLAR)[number];

/**
 * Tek bir kivilcim: dipte parlayarak buyur (patlama), yukselirken yana savrulur, kuculur ve soner;
 * yildizlar yukselirken doner.
 */
function Kivilcim({ ayar, rayAlt, rayUst }: { ayar: KivilcimAyari; rayAlt: number; rayUst: number }) {
  const t = useSharedValue(0);
  const yukseklik = ayar.tur === 'alev' ? ayar.boyut / ALEV_ORANI : ayar.boyut;

  useEffect(() => {
    t.value = withDelay(
      ayar.gecikme,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic), ...HAREKET }),
    );
  }, [t, ayar.gecikme]);

  const stil = useAnimatedStyle(() => {
    const y = rayAlt - t.value * ayar.yukselis * (rayAlt - rayUst);
    // Patlama: ilk %20'de 0.4 -> 1.3 buyur, sonra 0.4'e kuculur.
    const olcek = t.value < 0.2 ? 0.4 + 0.9 * (t.value / 0.2) : 1.3 - 0.9 * ((t.value - 0.2) / 0.8);
    // Hizla belirir, yolun yarisina kadar tam parlak kalir, sonra soner.
    const opaklik = t.value < 0.1 ? t.value / 0.1 : t.value < 0.5 ? 1 : 1 - (t.value - 0.5) / 0.5;
    return {
      top: y - yukseklik / 2,
      opacity: opaklik,
      transform: [
        { translateX: ayar.dx * t.value },
        { scale: olcek },
        { rotate: ayar.tur === 'kivilcim' ? `${t.value * 180}deg` : '0deg' },
      ],
    };
  }, [rayAlt, rayUst]);

  return (
    <Animated.View
      className="absolute"
      style={[{ left: (GENISLIK - ayar.boyut) / 2, width: ayar.boyut, height: yukseklik }, stil]}
    >
      {ayar.tur === 'alev' ? <AlevCizimi genislik={ayar.boyut} /> : <KivilcimCizimi boyut={ayar.boyut} />}
    </Animated.View>
  );
}

/**
 * Tek bir dart oku (#547): cubugun dibinden firlar, hafif bir yay cizerek tahtanin tam ortasina ucundan
 * saplanir ve egilir. Son ok disindakiler saplaninca soner -- tahtada tek ok kalir. `ucsun` degilse ok
 * dogrudan saplanmis haliyle cizilir (surecin sonraki takilislari).
 */
function Ok({
  sira,
  ucsun,
  sonuncu,
  rayAlt,
  hedefY,
}: {
  sira: number;
  ucsun: boolean;
  sonuncu: boolean;
  rayAlt: number;
  hedefY: number;
}) {
  // 0..1 ucus, 1..2 (son ok disinda) saplandiktan sonra sonme.
  const t = useSharedValue(ucsun ? 0 : 1);

  useEffect(() => {
    if (!ucsun) {
      return;
    }
    const ucus = withTiming(1, { duration: OK_UCUS, easing: Easing.out(Easing.quad), ...HAREKET });
    t.value = withDelay(
      sira * OK_ARALIGI,
      sonuncu ? ucus : withSequence(ucus, withDelay(120, withTiming(2, { duration: 160, ...HAREKET }))),
    );
  }, [t, ucsun, sonuncu, sira]);

  const stil = useAnimatedStyle(() => {
    const u = Math.min(1, t.value);
    const baslangic = rayAlt - 6;
    const ucY = baslangic + (hedefY - baslangic) * u;
    // Hafif yay: oklar sirayla sagdan ve soldan gelir.
    const yay = Math.sin(u * Math.PI) * (sira % 2 === 0 ? -4 : 4);
    const opaklik = t.value <= 1 ? (u < 0.05 ? u / 0.05 : 1) : 2 - t.value;
    return {
      top: ucY,
      opacity: opaklik,
      transform: [{ translateX: yay }, { rotate: `${OK_ACISI * u}deg` }],
    };
  }, [rayAlt, hedefY]);

  return (
    <Animated.View
      testID={ucsun ? 'ucan-ok' : 'saplanmis-ok'}
      className="absolute"
      style={[
        {
          left: (GENISLIK - OK_GENISLIK) / 2,
          width: OK_GENISLIK,
          height: OK_YUKSEKLIK,
          // Egilme ve yay okun UCU etrafinda: ucu tahtanin merkezinde kalir.
          transformOrigin: 'top',
        },
        stil,
      ]}
    >
      <OkCizimi genislik={OK_GENISLIK} />
    </Animated.View>
  );
}

/**
 * Ozet kartlarinin sagindaki dikey sayac (#544; #547'de Liquid Glass diliyle yeniden).
 *
 * #544'un ilk hali "kaba" bulundu (kullanici: "Apple'inki cok daha naif"): yuva simsiyah (`inset`),
 * ray 8 pt, halka kalin beyaz kenarli, dolgu tek duze turuncuydu. #547'de sadelesti (kullanici: "sade
 * ve sik"; Apple'in birebir kopyasi olmak zorunda degil) -- yuva ve uclardaki isaretler KALKTI:
 * - yalnizca ince (2.5 pt), soluk bir ray (`fg` %12);
 * - alttan yukari parlayan gradyan dolgu (`accent`, altta %35 -> ustte tam);
 * - 10 pt'lik ince kenarli halka, `accent` ile hafif parlar -- ya da rekordaysa halkanin yerinde ALEV.
 *
 * Alevin tirmanisi ve ok atisi uygulama SURECI basina bir kez oynar (`acilistaIlkKezMi`, her biri kendi
 * anahtariyla). Cihazda "hareketi azalt" aciksa (`ReduceMotion.System`) ikisi de dogrudan son haliyle
 * baslar: alev yerinde, tahtada tek ok; kivilcimlar ve ucan oklar gorunmez.
 *
 * Cizim SVG'de: ince cizgiler ve gradyan NativeWind siniflariyla kaba kaliyordu; yukseklik
 * `onLayout`tan gelir (sayac kartin boyunca uzanir).
 */
export default function DikeyCubuk({ testID, oran, deger, isaret = 'halka' }: Props) {
  const palet = useRenkPaleti();
  const [yukseklik, setYukseklik] = useState(0);
  const alev = isaret === 'alev';
  const dart = isaret === 'dart';
  // Bayrak yalnizca animasyonlu isarette ve TEK bir baslaticida tuketilir (uygulama StrictMode kullanmiyor).
  const [oynat] = useState(() => isaret !== 'halka' && acilistaIlkKezMi(isaret));
  // Isaretin hedefe dogru ne kadar yol aldigi: 0 = rayin dibi, 1 = yerinde. Yalnizca alev tirmanir.
  const ilerleme = useSharedValue(alev && oynat ? 0 : 1);
  const titreme = useSharedValue(1);
  const sarsinti = useSharedValue(1);

  useEffect(() => {
    if (!oynat || !dart) {
      return;
    }
    // Her isabette tahta hafifce sarsilir: ilk ok saplaninca, sonra her OK_ARALIGI'da bir.
    const sars = () =>
      withSequence(
        withTiming(1.14, { duration: 70, ...HAREKET }),
        withTiming(1, { duration: SARSINTI - 70, ...HAREKET }),
      );
    sarsinti.value = withSequence(
      withDelay(OK_UCUS, sars()),
      ...Array.from({ length: OK_SAYISI - 1 }, () => withDelay(OK_ARALIGI - SARSINTI, sars())),
    );
  }, [oynat, dart, sarsinti]);

  useEffect(() => {
    if (!oynat || !alev) {
      return;
    }
    ilerleme.value = withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic), ...HAREKET });
    // Tirmanirken hafif titreme; yerine oturunca durur.
    titreme.value = withSequence(
      withRepeat(
        withSequence(withTiming(0.88, { duration: 100, ...HAREKET }), withTiming(1.08, { duration: 100, ...HAREKET })),
        7,
        true,
      ),
      withTiming(1, { duration: 150, ...HAREKET }),
    );
  }, [oynat, alev, ilerleme, titreme]);

  const orta = GENISLIK / 2;
  const rayUst = UC_PAYI;
  const rayAlt = yukseklik - UC_PAYI;

  const dolguProps = useAnimatedProps(() => {
    const y = rayAlt - (oran ?? 0) * ilerleme.value * (rayAlt - rayUst);
    return { y, height: Math.max(0, rayAlt - y) };
  }, [oran, rayAlt, rayUst]);

  const isaretStili = useAnimatedStyle(() => {
    const y = rayAlt - (oran ?? 0) * ilerleme.value * (rayAlt - rayUst);
    if (alev) {
      return { top: y - ALEV_YUKSEKLIK * ALEV_TABANI, transform: [{ scaleX: titreme.value }] };
    }
    if (dart) {
      return { top: y - TAHTA / 2, transform: [{ scale: sarsinti.value }] };
    }
    return { top: y - HALKA / 2 };
  }, [oran, rayAlt, rayUst, alev, dart]);
  // Oklarin saplanacagi nokta: tahtanin merkezi (tahta tirmanmaz, dogrudan yerindedir).
  const tahtaMerkezi = rayAlt - (oran ?? 0) * (rayAlt - rayUst);

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
          {oran !== null && (
            <AnimatedRect
              x={orta - RAY_KALINLIGI / 2}
              width={RAY_KALINLIGI}
              rx={RAY_KALINLIGI / 2}
              fill={`url(#${testID}-gradyan)`}
              animatedProps={dolguProps}
            />
          )}
        </Svg>
      )}
      {/* Tirmanis sirasinda dipten firlayan kivilcimlar; yalnizca surecin ilk tirmanisinda. */}
      {oynat && alev && (
        <View testID="alev-kivilcimlari" pointerEvents="none" className="absolute inset-0">
          {KIVILCIMLAR.map((ayar, sira) => (
            <Kivilcim key={sira} ayar={ayar} rayAlt={rayAlt} rayUst={rayUst} />
          ))}
        </View>
      )}
      {oran !== null && (
        <Animated.View
          testID={`${testID}-dolu`}
          pointerEvents="none"
          className="absolute"
          style={[
            alev
              ? {
                  width: ALEV_GENISLIK,
                  height: ALEV_YUKSEKLIK,
                  left: (GENISLIK - ALEV_GENISLIK) / 2,
                  transformOrigin: 'bottom',
                }
              : dart
                ? { width: TAHTA, height: TAHTA, left: (GENISLIK - TAHTA) / 2 }
                : { width: HALKA, height: HALKA, left: (GENISLIK - HALKA) / 2 },
            isaretStili,
          ]}
        >
          {dart ? (
            <View testID={`${testID}-dart`}>
              <DartTahtasi boyut={TAHTA} />
            </View>
          ) : alev ? (
            <View testID={`${testID}-alev`}>
              <View testID={oynat ? 'alev-oynuyor' : 'alev-sabit'}>
                <AlevCizimi genislik={ALEV_GENISLIK} />
              </View>
            </View>
          ) : (
            <View
              testID={`${testID}-halka`}
              className="flex-1 rounded-full border-fg bg-surface-2"
              style={{
                borderWidth: 1.5,
                shadowColor: palet.accent,
                shadowOpacity: 0.8,
                shadowRadius: 5,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          )}
        </Animated.View>
      )}
      {/* Oklar tahtanin USTUNDE: ilk acilista 5 ok ucar, sonra yalnizca tam ortadan saplanmis tek ok. */}
      {dart && oran !== null && (
        <View pointerEvents="none" className="absolute inset-0">
          {oynat ? (
            Array.from({ length: OK_SAYISI }, (_, sira) => (
              <Ok
                key={sira}
                sira={sira}
                ucsun
                sonuncu={sira === OK_SAYISI - 1}
                rayAlt={rayAlt}
                hedefY={tahtaMerkezi}
              />
            ))
          ) : (
            <Ok sira={0} ucsun={false} sonuncu rayAlt={rayAlt} hedefY={tahtaMerkezi} />
          )}
        </View>
      )}
    </View>
  );
}
