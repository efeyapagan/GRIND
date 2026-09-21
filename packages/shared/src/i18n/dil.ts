/** Desteklenen arayuz dilleri (#177). Yeni bir dil eklemek bu tipi, DILLER'i ve kataloglari degistirir. */
export type Dil = 'tr' | 'en';

export const DILLER: readonly Dil[] = ['tr', 'en'];

/**
 * Tarayici/cihaz dil listesinden (`navigator.languages` sirasiyla) arayuz dilini secer: listede
 * desteklenen ILK dil kazanir -- `['en-US', 'tr']` Ingilizce ister. Hic desteklenen yoksa
 * uluslararasi kullanici icin Ingilizce; liste bossa (bilgi yok) uygulamanin ana dili Turkce.
 */
export function dilAlgila(diller: readonly string[]): Dil {
  if (diller.length === 0) {
    return 'tr';
  }
  for (const dil of diller) {
    const ana = dil.toLowerCase().split('-')[0];
    if (ana === 'tr' || ana === 'en') {
      return ana;
    }
  }
  return 'en';
}
