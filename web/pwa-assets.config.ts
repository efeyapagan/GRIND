import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

// Bir kerelik uretim (spec Karar 6): `npm run pwa:icons` ciktilari commit edilir, derleme hattina
// girmez. minimal-2023: 64/192/512 PNG, 512 maskable, 180 apple-touch, 48 px favicon.ico.
// maskable/apple icin uretici varsayilani %30 beyaz dolgu ekler (assets-generator/dist/index.mjs
// defaultPngOptions); spec Karar 6 tam kaplama #121316 istedigi icin padding 0 ve #121316 arka
// plan ile eziliyor (yoksa kurulan ikonun etrafinda beyaz bir halka gorunur).
export default defineConfig({
  preset: {
    ...preset,
    maskable: { ...preset.maskable, padding: 0, resizeOptions: { background: '#121316' } },
    apple: { ...preset.apple, padding: 0, resizeOptions: { background: '#121316' } },
  },
  images: ['public/icon.svg'],
});
