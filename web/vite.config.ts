import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

// API adresi ortamdan gelebilir; varsayilan, backend'in "http" profili.
// DIKKAT: https profiliyle calisirsa UseHttpsRedirection 307 doner ve proxy takip etmez.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5098';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Ikonlar Gorev 6'da eklenir. Tema rengi gorsel tasarim spec'i Karar 5.
      manifest: {
        name: 'GRIND',
        short_name: 'GRIND',
        start_url: '/',
        display: 'standalone',
        lang: 'tr',
        theme_color: '#121316',
        background_color: '#121316',
      },
      workbox: {
        // Uygulama kabugu onbellekten acilir. API yanitlari onbelleklenmez: bayat antrenman
        // verisi gostermek, veri gostermemekten daha kotu (mimari spec R14).
        navigateFallbackDenylist: [/^\/api\//],
        // Font kabuk varligidir, veri degil: yalnizca Turkce icin gereken iki alt kume precache'e
        // girer (gorsel tasarim spec'i Karar 3).
        globPatterns: [
          '**/*.{js,css,html}',
          '**/inter-latin-wght-normal-*.woff2',
          '**/inter-latin-ext-wght-normal-*.woff2',
        ],
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
