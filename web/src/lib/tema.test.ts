import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sistemTemasiniAyarla } from '../test/matchMedia';
import {
  TEMA_ANAHTARI,
  TEMA_RENKLERI,
  etkinTema,
  sistemDinleyicisiKur,
  tercihiDegistir,
  tercihiOku,
  temayiTazele,
} from './tema';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.head.innerHTML = '<meta name="theme-color" content="#121316" />';
});

test('saklanmamis ve taninmayan tercih "sistem" sayilir', () => {
  expect(tercihiOku()).toBe('sistem');

  localStorage.setItem(TEMA_ANAHTARI, 'mor');
  expect(tercihiOku()).toBe('sistem');

  localStorage.setItem(TEMA_ANAHTARI, 'acik');
  expect(tercihiOku()).toBe('acik');
});

test('etkin tema: "sistem" sistemi izler, elle secim sistemi ezer', () => {
  expect(etkinTema('sistem', true)).toBe('acik');
  expect(etkinTema('sistem', false)).toBe('koyu');
  expect(etkinTema('koyu', true)).toBe('koyu');
  expect(etkinTema('acik', false)).toBe('acik');
});

test('tema uygulanirken data-theme ve theme-color birlikte yazilir', () => {
  sistemTemasiniAyarla(true);

  expect(temayiTazele()).toBe('acik');
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    TEMA_RENKLERI.acik,
  );

  expect(tercihiDegistir('koyu')).toBe('koyu');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    TEMA_RENKLERI.koyu,
  );
});

test('tercih degistirilince localStorage yazilir', () => {
  tercihiDegistir('acik');

  expect(localStorage.getItem(TEMA_ANAHTARI)).toBe('acik');
});

test('sistem temasi degisince yalnizca "sistem" tercihinde ekran doner', () => {
  const temizle = sistemDinleyicisiKur();
  temayiTazele();
  expect(document.documentElement.dataset.theme).toBe('dark');

  sistemTemasiniAyarla(true);
  expect(document.documentElement.dataset.theme).toBe('light');

  // Elle "koyu" secildiyse sistemin acik olmasi ekrani cevirmez.
  tercihiDegistir('koyu');
  sistemTemasiniAyarla(false);
  sistemTemasiniAyarla(true);
  expect(document.documentElement.dataset.theme).toBe('dark');

  temizle();
  localStorage.setItem(TEMA_ANAHTARI, 'sistem');
  sistemTemasiniAyarla(false);
  // Dinleyici kaldirildi: DOM son uygulanan degerde kalir.
  expect(document.documentElement.dataset.theme).toBe('dark');
});

test('index.html satir ici scripti tema.ts sabitleriyle ayni degerleri kullanir', () => {
  // Satir ici script bir modul ice aktaramadigi icin anahtar ve renkler orada da yazili
  // (spec Karar 1). Bu test iki tarafin birbirinden kaymasini engeller.
  // DIKKAT: `import.meta.url` degiskene atanmadan dogrudan `new URL(...)` icine yazilirsa,
  // Vite'in statik asset-URL analizi bu deseni yakalayip dev-server HTTP adresine (http://localhost:.../index.html)
  // cevirir -- dosya sisteminden degil. Degiskene atamak bu donusumu devre disi birakir.
  const metaUrl = import.meta.url;
  const html = readFileSync(fileURLToPath(new URL('../../index.html', metaUrl)), 'utf8');

  expect(html).toContain(TEMA_ANAHTARI);
  expect(html).toContain(TEMA_RENKLERI.acik);
  expect(html).toContain(TEMA_RENKLERI.koyu);
});
