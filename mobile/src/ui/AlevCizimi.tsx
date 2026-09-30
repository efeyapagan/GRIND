import { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useEtkinTema, useRenkPaleti } from './renkler';

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
 * Rekordaki serinin alevi (#547) -- cubugun tepesinde halkanin yerini alir (bkz. `DikeyCubuk`).
 *
 * Kullanici ilk cizimi "dogal degil, dar" buldu: artik genis tabanli, ortada uzun bir dil ve iki
 * yanda kisa dillerle bir alev; icinde dipte en parlak olan bir cekirdek. Kare bir kutuya cizilir.
 * Renkler token'dan: govde `accent`, cekirdek iki temada da ACIK kalsin diye temanin en acik
 * token'i (koyuda `fg`, acikta `inset`).
 */
export default function AlevCizimi({ boyut }: { boyut: number }) {
  const palet = useRenkPaleti();
  const tema = useEtkinTema();
  // SVG `url(#...)` referansinda `:` sorun cikarir; useId'nin urettigi kimlik temizlenir.
  const kimlik = useId().replace(/[^a-zA-Z0-9]/g, '');
  const cekirdek = tema === 'acik' ? palet.inset : palet.fg;

  return (
    <Svg width={boyut} height={boyut} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id={`govde${kimlik}`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={palet.accent} stopOpacity={1} />
          <Stop offset="1" stopColor={palet.accent} stopOpacity={0.8} />
        </LinearGradient>
        <LinearGradient id={`cekirdek${kimlik}`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={cekirdek} stopOpacity={0.95} />
          <Stop offset="1" stopColor={cekirdek} stopOpacity={0.2} />
        </LinearGradient>
      </Defs>
      {/* Genis govde: ortada uzun dil, sagda ve solda kisa diller. */}
      <Path
        d="M16 1.5 C17.2 5.5 20.4 7.4 22.6 10.6 C24.2 8.6 24.6 6.6 24.4 4.8 C28.2 8.4 30 13.2 30 18.2 C30 25.8 23.8 31 16 31 C8.2 31 2 25.8 2 18.4 C2 13.6 4.4 9.8 7.4 7.4 C7.4 10 8.4 12 10 13.2 C10.6 8.6 12.8 4.6 16 1.5 Z"
        fill={`url(#govde${kimlik})`}
      />
      {/* Cekirdek: alevin en sicak yeri dipte. */}
      <Path
        d="M16 12.5 C17.6 15.6 21.6 17.6 21.6 22.4 C21.6 26.4 19.2 29 16 29 C12.8 29 10.4 26.6 10.4 23 C10.4 20.8 11.6 19 13.2 17.8 C13.4 19.6 14.2 20.8 15.4 21.4 C15 18.4 15.2 15.4 16 12.5 Z"
        fill={`url(#cekirdek${kimlik})`}
      />
    </Svg>
  );
}
