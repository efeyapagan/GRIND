import { expect, test } from 'vitest';
import {
  ayBasligi,
  ayIzgarasi,
  gezilebilirMi,
  gorunumAraligi,
  gunBasligi,
  haftaGunleri,
  kaydir,
  setKademesi,
  sonDonemler,
} from './takvim';

test('ay izgarasi Pazartesi baslar; ay disindaki hucreler bostur', () => {
  // 1 Eylul 2026 Salı, 30 Eylul Carsamba.
  const haftalar = ayIzgarasi('2026-09-15');

  expect(haftalar).toHaveLength(5);
  expect(haftalar[0]).toEqual([
    null,
    '2026-09-01',
    '2026-09-02',
    '2026-09-03',
    '2026-09-04',
    '2026-09-05',
    '2026-09-06',
  ]);
  expect(haftalar[4]).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', null, null, null, null]);
});

test('hafta Pazartesi baslar, Pazar biter ve ay gecisini asar (31 -> 1)', () => {
  const beklenen = [
    '2026-08-31',
    '2026-09-01',
    '2026-09-02',
    '2026-09-03',
    '2026-09-04',
    '2026-09-05',
    '2026-09-06',
  ];

  expect(haftaGunleri('2026-09-02')).toEqual(beklenen);
  // Pazar gunu bir SONRAKI haftanin degil, ayni haftanin son gunudur.
  expect(haftaGunleri('2026-09-06')).toEqual(beklenen);
});

test('set sayisi kademeye esiklerle cevrilir', () => {
  expect([0, 1, 8, 9, 16, 17, 24, 25, 60].map(setKademesi)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
});

test('ayBasligi ve gunBasligi TR baslik yazar', () => {
  expect(ayBasligi('2026-09-14', 'tr')).toBe('Eylül 2026');
  expect(gunBasligi('2026-09-14', 'tr')).toBe('14 Eylül');
});

test('Ingilizce ay ve gun basligi', () => {
  expect(ayBasligi('2026-09-14', 'en')).toBe('September 2026');
  expect(gunBasligi('2026-09-14', 'en')).toBe('14 September');
});

/**
 * #315: gezinme artik ok dugmeleriyle degil kaydirmayla. "Gelecege gezinilmez" kurali bu yuzden
 * bir dugmenin `disabled`i olmaktan cikip saf bir karara dondu; iki platform da bunu kullanir.
 */
test('bugunun doneminden ileri gezilmez, geriye her zaman gezilir', () => {
  const bugun = '2026-09-25';

  // Haftalik: bugunun haftasindan ileri kapali, onceki haftadan ileri (bugune dogru) acik.
  expect(gezilebilirMi('hafta', bugun, 1, bugun)).toBe(false);
  expect(gezilebilirMi('hafta', bugun, -1, bugun)).toBe(true);
  expect(gezilebilirMi('hafta', '2026-09-18', 1, bugun)).toBe(true);

  // Aylik: ayni kural ay biriminde.
  expect(gezilebilirMi('ay', bugun, 1, bugun)).toBe(false);
  expect(gezilebilirMi('ay', '2026-08-10', 1, bugun)).toBe(true);
});

test('kaydirma haftalikta 7 gun, aylikta bir ay ilerler', () => {
  expect(kaydir('hafta', '2026-09-25', 1)).toBe('2026-10-02');
  expect(kaydir('hafta', '2026-09-25', -1)).toBe('2026-09-18');
  expect(kaydir('ay', '2026-09-25', 1)).toBe('2026-10-01');
  expect(kaydir('ay', '2026-09-25', -1)).toBe('2026-08-01');
});

// ---- Donem secici (#420) ----

/**
 * Tum arkadaslar ekraninin donem penceresi: bugunun doneminden GERIYE dogru son donemler, en
 * yenisi basta. Her oge o donemin icinde bir gun (takvimin `gosterilen`i gibi) -- aralik
 * `gorunumAraligi` ile ayni kuraldan turer, ikinci bir donem hesabi yoktur.
 */
test('son haftalar bugunun haftasindan geriye, en yenisi basta', () => {
  const haftalar = sonDonemler('hafta', '2026-09-30', 3).map((gun) => gorunumAraligi('hafta', gun).from);

  expect(haftalar).toEqual(['2026-09-28', '2026-09-21', '2026-09-14']);
});

test('son aylar bugunun ayindan geriye ve yil gecisini asar', () => {
  const aylar = sonDonemler('ay', '2026-02-10', 3).map((gun) => gorunumAraligi('ay', gun).from);

  expect(aylar).toEqual(['2026-02-01', '2026-01-01', '2025-12-01']);
});

/** Gelecege gidilmez (#81): listenin ilk ogesi bugunun donemidir, sonrasi yoktur. */
test('listede gelecek donem yoktur', () => {
  const [ilk] = sonDonemler('hafta', '2026-09-30', 5);

  expect(gezilebilirMi('hafta', ilk, 1, '2026-09-30')).toBe(false);
});
