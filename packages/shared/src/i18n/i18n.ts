import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import type { Dil } from './dil';
import { tr } from './tr';
import { en } from './en';

export { i18n };
export { dilAlgila, DILLER, type Dil } from './dil';

// `t('antrenman.bitir')` tipli olsun: yanlis anahtar derlenmez (spec, Mimari).
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof tr };
  }
}

/**
 * Ortak i18next ornegini baslatir (web: main.tsx, mobil: _layout.tsx, testler: kurulum dosyalari).
 * Kaynaklar paketin icinde oldugu icin baslatma senkrondur -- ag istegi ve yanip sonen dil yok.
 * Iki kez cagrilirsa kaynaklari guncel katalogla tazeler ve dili degistirir (#324): mobilde hot
 * reload katalog dosyalarini yeniden calistirir ama i18next ornegi ilk acilistaki kaynaklarla
 * kalirdi -- yeni anahtarlar tam yeniden yuklemeye kadar ekranda ham gorunuyordu.
 */
export function i18nBaslat(dil: Dil): void {
  if (i18n.isInitialized) {
    kaynaklariTazele();
    void i18n.changeLanguage(dil);
    return;
  }
  void i18n.use(initReactI18next).init({
    resources: { tr: { translation: tr }, en: { translation: en } },
    lng: dil,
    fallbackLng: 'tr',
    supportedLngs: ['tr', 'en'],
    interpolation: { escapeValue: false },
    initAsync: false,
  });
}

function kaynaklariTazele(): void {
  i18n.addResourceBundle('tr', 'translation', tr, true, true);
  i18n.addResourceBundle('en', 'translation', en, true, true);
}

// Hot reload bu modulu (katalog degisince) yeniden calistirir ama `i18nBaslat`'i cagiran giris
// dosyasina (_layout.tsx) her zaman ulasmaz -- aradaki bilesen modulleri guncellemeyi durdurur.
// Ornek zaten baslatilmissa kaynaklar burada da tazelenir.
if (i18n.isInitialized) {
  kaynaklariTazele();
}

/** Etkin arayuz dili; dil degisince bileseni yeniden render eder (biçimlendiricilere verilir). */
export function useDil(): Dil {
  const { i18n: ornek } = useTranslation();
  return ornek.language === 'en' ? 'en' : 'tr';
}
