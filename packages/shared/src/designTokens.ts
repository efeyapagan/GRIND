/**
 * web/src/index.css'teki Tailwind v4 `@theme` blogunun duz-JS karsiligi. O dosya BILEREK
 * dokunulmadan birebir kopyalandi -- NativeWind (Tailwind v3 tabanli) CSS-native `@theme`'i
 * desteklemez, bu yuzden mobile/tailwind.config.js bu sabitleri `theme.extend` altinda kullanir.
 * Iki taraf da AYNI degerleri elle senkron tutar; biri degisirse digeri de guncellenmeli.
 */
export const renklerKoyu = {
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
  'accent-fg': '#ff5722',
  danger: '#ffb4ab',
  'danger-bg': '#93000a',
  'on-danger-bg': '#ffdad6',
  success: '#6fdc8c',
  'on-success': '#00391b',
} as const;

/**
 * Acik tema paleti (#271, mobil). Degerler web'in `:root[data-theme='light']` blogundan (#178)
 * birebir alindi -- orada kontrast esikleriyle birlikte secilmislerdi; burada `paletKontrast.test.ts`
 * ayni esikleri IKI palet icin de olcer.
 *
 * `accent` ve `on-accent` iki temada AYNI (marka rengi ve uzerindeki metin); geri kalan her token
 * ezilir. Yeni bir token eklenirken ikisine de yazilir, aksi halde palet testi patlar.
 */
export const renklerAcik = {
  ...renklerKoyu,
  bg: '#fdf8f6',
  inset: '#ffffff',
  'surface-1': '#f8f2ef',
  'surface-2': '#f2ece9',
  'surface-3': '#ece6e3',
  'surface-4': '#e7e0dd',
  fg: '#1d1b1a',
  muted: '#5b5654',
  'accent-soft': '#a03500',
  'accent-fg': '#a03500',
  danger: '#ba1a1a',
  'danger-bg': '#ffdad6',
  'on-danger-bg': '#410002',
  success: '#1b7a36',
  'on-success': '#ffffff',
} as const;

/** Iki temada da AYNI kalan token'lar; palet testi bunlarin ezilmesini beklemez. */
export const IKI_TEMADA_AYNI = ['accent', 'on-accent'] as const;

/** Iki paletin ortak sekli: anahtarlar sabit, degerler serbest hex (literal tip DEGIL). */
export type RenkPaleti = { readonly [K in keyof typeof renklerKoyu]: string };

/**
 * Geriye donuk ad: tema oncesi tek palet buydu. Tema BILMEYEN yerler (yalnizca derleme zamani
 * sabitine ihtiyac duyan tailwind.config gibi) icin duruyor; calisma zamaninda renk okuyan her
 * yer `useRenkPaleti()`/`useIkonRenk()` uzerinden gitmeli, yoksa acik temada koyu renk cizer.
 */
export const renkler = renklerKoyu;

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
