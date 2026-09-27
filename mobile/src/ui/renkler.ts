import { useColorScheme } from 'nativewind';
import { renklerAcik, renklerKoyu, type RenkPaleti } from '@grind/shared/designTokens';

/**
 * Etkin temanin paleti (#271). NativeWind'in `colorScheme`i TEK dogruluk kaynagidir: Tailwind
 * siniflari global.css'teki degiskenlerden, buradan renk okuyan JS tarafi ayni temadan beslenir.
 *
 * Bir HOOK olmasi sart: tema degisince renk okuyan bileşen yeniden CIZILMELI. Onceki denemedeki
 * modul seviyesindeki `isLightMode` degiskeni yeniden cizim tetiklemedigi icin ikonlar eski
 * temada kaliyordu.
 *
 * `colorScheme` ilk karede belirsiz olabiliyor; uygulama bugune kadar koyu oldugu icin
 * belirsizlikte koyuya duseriz (acik bir kare parlamasin).
 */
export function useEtkinTema(): 'acik' | 'koyu' {
  return useColorScheme().colorScheme === 'light' ? 'acik' : 'koyu';
}

export function useRenkPaleti(): RenkPaleti {
  return useEtkinTema() === 'acik' ? renklerAcik : renklerKoyu;
}

export interface IkonRenkleri {
  fg: string;
  muted: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  success: string;
  onSuccess: string;
  danger: string;
  onDanger: string;
}

/**
 * lucide-react-native SVG ikonlari NativeWind className'inden renk ALAMAZ (cssInterop kurulumu
 * gerektirir) -- bu yuzden ikon renkleri token'lardan dogrudan hex olarak okunur. Tailwind
 * siniflariyla (`text-muted`, `text-accent` vb.) BIREBIR ayni degerler, etkin temaya gore.
 */
export function useIkonRenk(): IkonRenkleri {
  const palet = useRenkPaleti();
  return {
    fg: palet.fg,
    muted: palet.muted,
    accent: palet.accent,
    onAccent: palet['on-accent'],
    accentSoft: palet['accent-soft'],
    success: palet.success,
    onSuccess: palet['on-success'],
    danger: palet.danger,
    onDanger: palet['on-danger-bg'],
  };
}

/**
 * #439: birincil (accent dolgulu) dugmenin hafif turuncu parlamasi. Golge NativeWind sinifiyla
 * renklendirilemedigi icin stil olarak verilir; etkin temanin `accent`i (iki temada ayni).
 * iOS'ta cizilir; Android'in `elevation`u olmadan golge stili etkisizdir.
 */
export function useAccentParlama() {
  const palet = useRenkPaleti();
  return { shadowColor: palet.accent, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } };
}

/**
 * #439: parmagin altinda kalkik duran kartin golgesi -- kart yerinden koptugu, ustte "suzuldugu"
 * hissini veren sey. Golge rengi bir palet token'i DEGIL, siyah: bir golge her iki temada da
 * koyudur, `fg`/`inset` gibi token'lar temaya gore terse doner. Tema farki opaklikta -- acik
 * temada daha hafif, koyu temada daha belirgin (`SablonMenusu`'nun `bg-black/30` - `bg-black/60`
 * perdesiyle ayni yaklasim).
 *
 * Olculer karuselin dikey nefes payina gore secilidir (bkz. `SablonKaruseli` UST_PAY / ALT_PAY):
 * golge o payin disina tasarsa `ScrollView` onu kirpar.
 */
export function useKalkikGolge() {
  return {
    shadowColor: '#000000',
    shadowOpacity: useEtkinTema() === 'acik' ? 0.25 : 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  };
}
