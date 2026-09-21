/**
 * Turkce katalog -- TEK dogruluk kaynagi (#177). `en.ts` bu nesnenin tipini tasir; eksik ya da
 * fazla anahtar `tsc -b`'de hata verir. Anahtar kurallari: docs/superpowers/plans/2026-09-21-coklu-dil-web.md.
 */
export const tr = {
  ortak: {
    yukleniyor: 'Yükleniyor...',
  },
  hatalar: {
    beklenmeyen: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
  },
  rekor: {
    agirlik: 'Ağırlık rekoru',
    tekrar: 'Tekrar rekoru',
  },
  setGirdisi: {
    agirlikGerekli: 'Ağırlık girilmeli.',
    agirlikSayiOlmali: 'Ağırlık geçerli bir sayı olmalı.',
    tekrarGerekli: 'Tekrar sayısı girilmeli.',
    tekrarTamSayiOlmali: 'Tekrar sayısı tam sayı olmalı.',
    rirTamSayiOlmali: 'RIR tam sayı olmalı.',
  },
  dil: {
    etiket: 'Dil',
    turkce: 'Türkçe',
    ingilizce: 'English',
  },
};

export type Katalog = typeof tr;
