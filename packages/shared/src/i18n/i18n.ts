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
 * Iki kez cagrilirsa yalnizca dili degistirir.
 */
export function i18nBaslat(dil: Dil): void {
  if (i18n.isInitialized) {
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

/** Etkin arayuz dili; dil degisince bileseni yeniden render eder (biçimlendiricilere verilir). */
export function useDil(): Dil {
  const { i18n: ornek } = useTranslation();
  return ornek.language === 'en' ? 'en' : 'tr';
}
