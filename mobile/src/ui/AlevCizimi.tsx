import { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useRenkPaleti } from './renkler';

/**
 * "Bu surecte alev zaten tirmandi mi" -- uygulama SURECI basina bir kez (#547, kullanici karari:
 * "uygulama ilk acildiginda alevler yukselerek en uste cikacak", sonra kapatilip acilana kadar tepede
 * kalacak). Modul seviyesinde tutulur: ekrandan cikip donmek bileseni yeniden takar ama bu degeri
 * sifirlamaz; uygulama kapatilip acilinca modul yeniden yuklenir ve animasyon tekrar oynar.
 */
let tirmandi = false;

/** Bayragi tuketir: surecin ilk cagrisi `true`, sonrakiler `false`. */
export function alevIlkKezMi(): boolean {
  if (tirmandi) {
    return false;
  }
  tirmandi = true;
  return true;
}

/** Yalnizca testler icin: bir sonraki takilisi "uygulamanin ilk acilisi" yapar. */
export function alevOturumunuSifirla() {
  tirmandi = false;
}

/**
 * Alevin en-boy orani (genislik : yukseklik). Kare kutuda "yayvan", 3:4'te "enine genis", yatayda
 * %70'e sikistirilinca "boydan cok uzun" bulundu; dikeyde de %85'e kisaltildi (~0.62).
 */
export const ALEV_ORANI = 16.8 / 27.2;

/**
 * Rekordaki serinin alevi (#547) -- cubugun tepesinde halkanin yerini alir (bkz. `DikeyCubuk`);
 * kucuk hali tirmanista dipten firlayan kivilcimlarda da kullanilir.
 *
 * Kullanici geri bildirimleri: ilk damla "dogal degil, dar"; kare kutudaki ikinci hali "yayvan"; beyaz
 * cekirdek "o kadar beyaz olmasina gerek yok, daha cok renk tonu ve gecisi"; 3:4 hali "enine genis".
 * Simdi ~0.62 oraninda (3:4 ile ince hali arasinda) dikey bir alev, uc katman ve beyazsiz bir sicaklik gecisi:
 * - dis govde: dipte turuncu (`accent`), uclarda koyu kizil (`alev-dip`);
 * - orta dil: dipte kehribar (`alev-sicak`), yukarida turuncu;
 * - cekirdek: dipte acik kehribar (`alev-acik`), yukari dogru kehribara soner.
 * Ates tonlari IKI TEMADA AYNI token'lardir (accent gibi): ates iki temada da ates gibi gorunur.
 */
export default function AlevCizimi({ genislik }: { genislik: number }) {
  const palet = useRenkPaleti();
  // SVG `url(#...)` referansinda `:` sorun cikarir; useId'nin urettigi kimlik temizlenir.
  const kimlik = useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <Svg width={genislik} height={genislik / ALEV_ORANI} viewBox="0 0 16.8 27.2">
      <Defs>
        <LinearGradient id={`dis${kimlik}`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={palet.accent} />
          <Stop offset="0.55" stopColor={palet.accent} />
          <Stop offset="1" stopColor={palet['alev-dip']} />
        </LinearGradient>
        <LinearGradient id={`orta${kimlik}`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={palet['alev-sicak']} />
          <Stop offset="1" stopColor={palet.accent} />
        </LinearGradient>
        <LinearGradient id={`cekirdek${kimlik}`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={palet['alev-acik']} />
          <Stop offset="1" stopColor={palet['alev-sicak']} stopOpacity={0.6} />
        </LinearGradient>
      </Defs>
      {/* Dis govde: uzun ana dil hafif saga kivrilir, sagda kisa bir yan dil. */}
      <Path
        d="M 7.98 0.51 C 9.24 3.91 12.32 6.63 13.58 10.37 C 14.14 9.18 14.28 7.99 14.14 6.97 C 15.82 9.52 16.38 12.75 16.38 15.81 C 16.38 22.1 13.02 26.69 8.4 26.69 C 3.78 26.69 0.42 22.44 0.42 16.83 C 0.42 12.07 2.66 8.84 4.9 6.8 C 4.76 8.84 5.32 10.37 6.3 11.22 C 6.16 7.31 6.72 3.57 7.98 0.51 Z"
        fill={`url(#dis${kimlik})`}
      />
      {/* Orta dil. */}
      <Path
        d="M 8.4 7.31 C 9.52 10.2 12.32 12.41 12.32 17.34 C 12.32 21.76 10.64 24.99 8.4 24.99 C 6.16 24.99 4.48 21.93 4.48 18.02 C 4.48 15.3 5.6 13.26 7 11.9 C 7 13.77 7.56 15.13 8.4 15.81 C 7.98 12.92 7.98 10.03 8.4 7.31 Z"
        fill={`url(#orta${kimlik})`}
      />
      {/* Cekirdek: alevin en sicak yeri dipte. */}
      <Path
        d="M 8.4 14.62 C 9.24 16.49 10.5 17.68 10.5 20.23 C 10.5 22.61 9.52 24.14 8.4 24.14 C 7.28 24.14 6.3 22.61 6.3 20.57 C 6.3 19.04 6.86 17.85 7.56 17.17 C 7.7 18.02 7.98 18.53 8.4 18.87 C 8.26 17.34 8.26 15.98 8.4 14.62 Z"
        fill={`url(#cekirdek${kimlik})`}
      />
    </Svg>
  );
}

/**
 * Tirmanista dipten firlayan kivilcim (#547): dort koseli, ince kollu bir yildiz. Govdesi kehribar,
 * ortasi acik kehribar -- alevle ayni ates tonlari.
 */
export function KivilcimCizimi({ boyut }: { boyut: number }) {
  const palet = useRenkPaleti();
  return (
    <Svg width={boyut} height={boyut} viewBox="0 0 12 12">
      <Path d="M6 0 L7.1 4.9 L12 6 L7.1 7.1 L6 12 L4.9 7.1 L0 6 L4.9 4.9 Z" fill={palet['alev-sicak']} />
      <Path d="M6 3.2 L6.6 5.4 L8.8 6 L6.6 6.6 L6 8.8 L5.4 6.6 L3.2 6 L5.4 5.4 Z" fill={palet['alev-acik']} />
    </Svg>
  );
}
