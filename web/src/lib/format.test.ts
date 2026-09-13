import { formatKisaTarih, formatTrDate, formatTrTime, formatWeight } from './format';

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
