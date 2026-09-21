import '@testing-library/jest-dom/vitest';
import { i18n, i18nBaslat } from '@grind/shared/i18n';
import { matchMediaSifirla, matchMediaStubuKur } from './matchMedia';
import { server } from './msw';

// MSW: gercek ag cagrisi asla gitmesin -- tanimlanmamis bir istek gelirse test hemen patlasin
// (sessizce gecmesin), ki eksik bir handler fark edilmeden kalmasin.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// jsdom matchMedia tanimlamaz; tema kodu (#178) onsuz patlar.
matchMediaStubuKur();
afterEach(matchMediaSifirla);

// #177: mevcut testler Turkce metinle sorgular -- dil her testte Turkceye sabitlenir, bir testin
// sectigi dil digerine sizmaz.
i18nBaslat('tr');
afterEach(() => {
  void i18n.changeLanguage('tr');
  document.documentElement.lang = 'tr';
});
