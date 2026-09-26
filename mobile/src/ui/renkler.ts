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
