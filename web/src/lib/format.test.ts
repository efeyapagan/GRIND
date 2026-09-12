import { formatTrDate, formatTrTime, formatWeight } from './format';

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
