import { expect, test } from 'vitest';
import { anahtaraGoreTasi, indeksleTasi, surukleHedefIndeksi, yonleTasi } from './siralama';

const LISTE = [{ anahtar: 1 }, { anahtar: 2 }, { anahtar: 3 }, { anahtar: 4 }];

test('ogeyi ileri tasir, aradakiler bir geri kayar', () => {
  expect(anahtaraGoreTasi(LISTE, 1, 3)).toEqual([{ anahtar: 2 }, { anahtar: 3 }, { anahtar: 1 }, { anahtar: 4 }]);
});

test('ogeyi geri tasir, aradakiler bir ileri kayar', () => {
  expect(anahtaraGoreTasi(LISTE, 4, 2)).toEqual([{ anahtar: 1 }, { anahtar: 4 }, { anahtar: 2 }, { anahtar: 3 }]);
});

test('bitisik ogeleri tasimak basit bir yer degistirmedir', () => {
  expect(anahtaraGoreTasi(LISTE, 2, 3)).toEqual([{ anahtar: 1 }, { anahtar: 3 }, { anahtar: 2 }, { anahtar: 4 }]);
});

test('ayni anahtar uzerine birakilirsa sira degismez ama yeni dizi dondurulur', () => {
  const sonuc = anahtaraGoreTasi(LISTE, 2, 2);
  expect(sonuc).toEqual(LISTE);
  expect(sonuc).not.toBe(LISTE);
});

test('olmayan bir anahtar verilirse liste degismeden dondurulur', () => {
  expect(anahtaraGoreTasi(LISTE, 99, 2)).toEqual(LISTE);
  expect(anahtaraGoreTasi(LISTE, 1, 99)).toEqual(LISTE);
});

test('bos liste guvenle ele alinir', () => {
  expect(anahtaraGoreTasi([], 1, 2)).toEqual([]);
});

// #229: yukari/asagi dugmeleri (sablon formu ve antrenman, web + mobil) ayni yardimciyi kullanir.
test('yonleTasi ogeyi komsusuyla yer degistirir', () => {
  expect(yonleTasi([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
  expect(yonleTasi([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
});

test('yonleTasi listenin disina tasimaz, liste aynen doner', () => {
  expect(yonleTasi([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  expect(yonleTasi([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
});

// #344: mobilde basili tutup surukleyerek sablon siralama. Surukleme mesafesini hedef indekse
// ceviren hesap burada, jestten bagimsiz test edilir (gercek surukleme RNTL'de simule edilemez).
// #407: hesap artik her satirin kendi yuksekligini alir (antrenman kartlari set sayisina gore uzar).
const ESIT = [64, 64, 64, 64];

test('yarim satirdan az surukleme sirayi degistirmez', () => {
  expect(surukleHedefIndeksi(1, 20, ESIT)).toBe(1);
  expect(surukleHedefIndeksi(1, -31, ESIT)).toBe(1);
});

test('yarim satiri gecen surukleme bir sira tasir', () => {
  expect(surukleHedefIndeksi(1, 33, ESIT)).toBe(2);
  expect(surukleHedefIndeksi(1, -33, ESIT)).toBe(0);
});

test('bir bucuk satirlik surukleme iki sira tasir', () => {
  expect(surukleHedefIndeksi(0, 96, ESIT)).toBe(2);
});

test('listenin disina tasan surukleme uclara sabitlenir', () => {
  expect(surukleHedefIndeksi(3, 500, ESIT)).toBe(3);
  expect(surukleHedefIndeksi(0, -500, ESIT)).toBe(0);
});

// Satir yuksekligi olculmeden (0) birakilirsa bolme NaN uretir; oge yerinde kalmali.
test('satir yuksekligi bilinmiyorsa oge yerinde kalir', () => {
  expect(surukleHedefIndeksi(2, 120, [64, 64, 0, 64])).toBe(2);
});

// #407: bir komsunun yerine gecmek icin O KOMSUNUN yarisini gecmek gerekir -- esit yukseklik
// varsayimi uzun bir kartin ustunden erken atlardi.
test('uzun bir komsunun yarisini gecmeyen surukleme sirayi degistirmez', () => {
  expect(surukleHedefIndeksi(0, 80, [60, 200, 60])).toBe(0);
  expect(surukleHedefIndeksi(2, -80, [60, 200, 60])).toBe(2);
});

test('uzun bir komsunun yarisini gecen surukleme bir sira tasir', () => {
  expect(surukleHedefIndeksi(0, 110, [60, 200, 60])).toBe(1);
  expect(surukleHedefIndeksi(2, -110, [60, 200, 60])).toBe(1);
});

test('indeksleTasi ogeyi hedef indekse tasir, aradakiler kayar', () => {
  expect(indeksleTasi(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  expect(indeksleTasi(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
});

test('indeksleTasi ayni indekse birakmayi degisiklik saymaz ama yeni dizi doner', () => {
  const liste = ['a', 'b'];
  const sonuc = indeksleTasi(liste, 1, 1);
  expect(sonuc).toEqual(liste);
  expect(sonuc).not.toBe(liste);
});
