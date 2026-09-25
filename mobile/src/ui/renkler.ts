import { renkler } from '@grind/shared/designTokens';

/**
 * lucide-react-native SVG ikonlari NativeWind className'inden renk ALAMAZ (cssInterop kurulumu
 * gerektirir) -- bu yuzden ikon renkleri burada token'lardan dogrudan hex olarak okunur. Web'deki
 * className tabanli renklerle (`text-muted`, `text-accent` vb.) BIREBIR ayni degerler.
 */
export const ikonRenk = {
  fg: renkler.fg,
  muted: renkler.muted,
  accent: renkler.accent,
  onAccent: renkler['on-accent'],
  accentSoft: renkler['accent-soft'],
  onSuccess: renkler['on-success'],
  danger: renkler.danger,
  onDanger: renkler['on-danger-bg'],
} as const;
