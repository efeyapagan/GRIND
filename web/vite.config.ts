import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// API adresi ortamdan gelebilir; varsayilan, backend'in "http" profili.
// DIKKAT: https profiliyle calisirsa UseHttpsRedirection 307 doner ve proxy takip etmez.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5098';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Ikonlar ve tema renkleri BILEREK yok: gorsel tasarim ayri bir adim (spec).
      manifest: {
        name: 'GRIND',
        short_name: 'GRIND',
        start_url: '/',
        display: 'standalone',
        lang: 'tr',
      },
      workbox: {
        // Uygulama kabugu onbellekten acilir. API yanitlari onbelleklenmez: bayat antrenman
        // verisi gostermek, veri gostermemekten daha kotu.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: false,
  },
});
