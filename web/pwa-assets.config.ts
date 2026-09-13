import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

// Bir kerelik uretim (spec Karar 6): `npm run pwa:icons` ciktilari commit edilir, derleme hattina
// girmez. minimal-2023: 64/192/512 PNG, 512 maskable, 180 apple-touch, 48 px favicon.ico.
export default defineConfig({
  preset,
  images: ['public/icon.svg'],
});
