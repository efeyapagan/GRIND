import type { Egzersiz } from '../api/queries';

/** Egzersiz secim listeleri Turkce alfabetik siradadir (Bugun paneli, sablon duzenleyici). */
export function adaGoreSirala(egzersizler: readonly Egzersiz[]): Egzersiz[] {
  return [...egzersizler].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}
