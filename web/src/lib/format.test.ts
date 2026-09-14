import {
  formatAralik,
  formatFark,
  formatKisaTarih,
  formatTrDate,
  formatTrTime,
  formatWeight,
  trBugundenOnce,
} from './format';

// Turkiye 2016'dan beri yaz saati uygulamiyor, sabit UTC+3 -- bu yuzden bu testler
// cihazin/CI'in yerel saat dilimine bagli olmadan hep ayni sonucu vermeli.
test('formatTrDate gun sinirini dogru gecer', () => {
  // UTC 21:30 -> TR (UTC+3) 00:30, yani ERTESI GUN.
  expect(formatTrDate('2026-03-10T21:30:00Z')).toBe('11.03.2026');
});

test('formatTrTime ayni anin TR saatini dondurur', () => {
  expect(formatTrTime('2026-03-10T21:30:00Z')).toBe('00:30');
});

test('formatWeight ondalikli agirligi virgulle gosterir', () => {
  expect(formatWeight(82.5)).toBe('82,5');
});

test('formatWeight tam sayida virgul eklemez', () => {
  expect(formatWeight(80)).toBe('80');
});

test('formatWeight sifiri bos degil gecerli deger olarak gosterir', () => {
  expect(formatWeight(0)).toBe('0');
});

test('formatWeight iki ondalikli agirligi YUVARLAMADAN gosterir', () => {
  // Backend numeric(6,2) sakliyor, 2 ondalik kabul ediyor -- 1 ondalige yuvarlamak
  // sunucu degerini istemcide degistirmek olurdu (review bulgusu I2).
  expect(formatWeight(61.25)).toBe('61,25');
});

test('formatWeight hacim gibi iki ondalikli buyuk degerleri de yuvarlamaz', () => {
  expect(formatWeight(306.25)).toBe('306,25');
});

test('formatKisaTarih gun ve kisa ay adini TR gunune gore verir', () => {
  expect(formatKisaTarih('2026-09-12T08:00:00Z')).toBe('12 Eyl');
  // UTC 22:30 -> TR 01:30, ERTESI GUN.
  expect(formatKisaTarih('2026-09-12T22:30:00Z')).toBe('13 Eyl');
});

test('trBugundenOnce TR gununden geriye sayar ve gun sinirini TR saatine gore gecer', () => {
  // UTC 21:30 -> TR 00:30, yani TR'de 15 Eylul; 30 gun oncesi 16 Agustos.
  expect(trBugundenOnce(30, new Date('2026-09-14T21:30:00Z'))).toBe('2026-08-16');
  expect(trBugundenOnce(0, new Date('2026-09-14T09:00:00Z'))).toBe('2026-09-14');
});

test('formatAralik ilk ve son TR gununu yil ile yazar', () => {
  expect(formatAralik('2026-08-25T08:00:00Z', '2026-09-10T08:00:00Z')).toBe('25 Ağu – 10 Eyl 2026');
  // M1 (review bulgusu): yillar FARKLIYSA ("2027" yalnizca sonda yazilirsa ilk tarihin de 2027'de
  // oldugu sanilir) ilk tarih de kendi yiliyla yazilir.
  expect(formatAralik('2026-12-20T08:00:00Z', '2027-01-05T08:00:00Z')).toBe('20 Ara 2026 – 5 Oca 2027');
});

test('formatFark isaretli ve TR ondalikli yazar', () => {
  expect(formatFark(2.5)).toBe('+2,5');
  expect(formatFark(-32.5)).toBe('−32,5');
  expect(formatFark(0)).toBe('0');
});
