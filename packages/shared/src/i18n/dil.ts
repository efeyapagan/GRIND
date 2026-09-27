/** Desteklenen arayuz dilleri (#177). Yeni bir dil eklemek bu tipi, DILLER'i ve kataloglari degistirir. */
export type Dil = 'tr' | 'en';

export const DILLER: readonly Dil[] = ['tr', 'en'];

/**
 * Dilin KENDI adi: "English"i anlamayan biri Ingilizce'yi bulamaz. Arayuz diline gore CEVRILMEZ
 * (i18n-muaf), bu yuzden katalogda degil burada durur.
 */
export const DIL_ADLARI: Record<Dil, string> = {
  tr: 'Türkçe',
  en: 'English',
};

/**
 * AI yorum dili seciciSinin bayragi (#199, kullanici karari: Turkce icin TR, Ingilizce icin UK).
 * DIKKAT: bir bayrak bir dil DEGILDIR -- Ingilizce yalnizca Birlesik Krallik'in dili degil ve yeni
 * diller geldikce esleme her zaman temiz olmayacak (ornegin Portekizce PT mi BR mi). Yeni bir dil
 * eklerken bu karari kullaniciya sor.
 */
export const DIL_BAYRAKLARI: Record<Dil, string> = {
  tr: '🇹🇷',
  en: '🇬🇧',
};

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
