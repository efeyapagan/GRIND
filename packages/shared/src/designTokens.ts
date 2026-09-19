/**
 * web/src/index.css'teki Tailwind v4 `@theme` blogunun duz-JS karsiligi. O dosya BILEREK
 * dokunulmadan birebir kopyalandi -- NativeWind (Tailwind v3 tabanli) CSS-native `@theme`'i
 * desteklemez, bu yuzden mobile/tailwind.config.js bu sabitleri `theme.extend` altinda kullanir.
 * Iki taraf da AYNI degerleri elle senkron tutar; biri degisirse digeri de guncellenmeli.
 */
export const renkler = {
  bg: '#121316',
  inset: '#0d0e11',
  'surface-1': '#1b1b1f',
  'surface-2': '#1f1f23',
  'surface-3': '#292a2d',
  'surface-4': '#343538',
  fg: '#e3e2e6',
  muted: '#c5c6c8',
  accent: '#ff5722',
  'on-accent': '#541200',
  'accent-soft': '#ffb5a0',
  danger: '#ffb4ab',
  'danger-bg': '#93000a',
  'on-danger-bg': '#ffdad6',
} as const;

export const yaziBoyutlari = {
  title: '26px',
  heading: '20px',
  metric: '28px',
  'body-lg': '16px',
  body: '14px',
  label: '12px',
  'label-xs': '10px',
} as const;

export const yaziAilesi = {
  sans: ['Inter Variable', 'System'],
} as const;
