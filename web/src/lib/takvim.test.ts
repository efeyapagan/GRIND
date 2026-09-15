import { ayIzgarasi, haftaGunleri, setKademesi } from './takvim';

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
