import { dilAlgila, i18n, type Dil } from '@grind/shared/i18n';

/**
 * Arayuz dili tercihi (#177; spec Karar 2). Tercih CIHAZDA saklanir (`localStorage`), sunucuya
 * gitmez -- tema tercihiyle (tema.ts) ayni gerekce. Tercih yoksa tarayici dili kullanilir.
 * `localStorage` erisilemezse (gizli pencere, engelli site verisi) tercih yok sayilir, uygulama
 * cokmez; secim o oturumla sinirli kalir.
 */
export const DIL_ANAHTARI = 'grind.dil';

export function dilTercihiniOku(): Dil | null {
  try {
    const saklanan = localStorage.getItem(DIL_ANAHTARI);
    return saklanan === 'tr' || saklanan === 'en' ? saklanan : null;
  } catch {
    return null;
  }
}

export function etkinDil(): Dil {
  return dilTercihiniOku() ?? dilAlgila(navigator.languages ?? [navigator.language]);
}

/** Dili ekrana uygular: i18next + `<html lang>` (ekran okuyucular ve tarayici ceviri onerisi icin). */
export function diliUygula(dil: Dil): void {
  void i18n.changeLanguage(dil);
  document.documentElement.lang = dil;
}

export function diliDegistir(dil: Dil): void {
  try {
    localStorage.setItem(DIL_ANAHTARI, dil);
  } catch {
    // Saklanamadiysa secim bu oturumla sinirli kalir.
  }
  diliUygula(dil);
}
