import {
  formatAralik,
  formatFark,
  formatGoreliTarih,
  formatKisaTarih,
  formatSaat,
  formatTarih,
  formatWeight,
  trBugundenOnce,
} from './format';

// Turkiye 2016'dan beri yaz saati uygulamiyor, sabit UTC+3 -- bu yuzden bu testler
// cihazin/CI'in yerel saat dilimine bagli olmadan hep ayni sonucu vermeli.
test('formatTarih gun sinirini dogru gecer', () => {
  // UTC 21:30 -> TR (UTC+3) 00:30, yani ERTESI GUN.
  expect(formatTarih('2026-03-10T21:30:00Z', 'tr')).toBe('11.03.2026');
});

test('formatSaat ayni anin TR saatini dondurur', () => {
  expect(formatSaat('2026-03-10T21:30:00Z')).toBe('00:30');
});

test('formatWeight ondalikli agirligi virgulle gosterir', () => {
  expect(formatWeight(82.5, 'tr')).toBe('82,5');
});

test('formatWeight tam sayida virgul eklemez', () => {
  expect(formatWeight(80, 'tr')).toBe('80');
});

test('formatWeight sifiri bos degil gecerli deger olarak gosterir', () => {
  expect(formatWeight(0, 'tr')).toBe('0');
});

test('formatWeight iki ondalikli agirligi YUVARLAMADAN gosterir', () => {
  // Backend numeric(6,2) sakliyor, 2 ondalik kabul ediyor -- 1 ondalige yuvarlamak
  // sunucu degerini istemcide degistirmek olurdu (review bulgusu I2).
  expect(formatWeight(61.25, 'tr')).toBe('61,25');
});

test('formatWeight hacim gibi iki ondalikli buyuk degerleri de yuvarlamaz', () => {
  expect(formatWeight(306.25, 'tr')).toBe('306,25');
});

test('formatKisaTarih gun ve kisa ay adini TR gunune gore verir', () => {
  expect(formatKisaTarih('2026-09-12T08:00:00Z', 'tr')).toBe('12 Eyl');
  // UTC 22:30 -> TR 01:30, ERTESI GUN.
  expect(formatKisaTarih('2026-09-12T22:30:00Z', 'tr')).toBe('13 Eyl');
});

test('trBugundenOnce TR gununden geriye sayar ve gun sinirini TR saatine gore gecer', () => {
  // UTC 21:30 -> TR 00:30, yani TR'de 15 Eylul; 30 gun oncesi 16 Agustos.
  expect(trBugundenOnce(30, new Date('2026-09-14T21:30:00Z'))).toBe('2026-08-16');
  expect(trBugundenOnce(0, new Date('2026-09-14T09:00:00Z'))).toBe('2026-09-14');
});

test('formatAralik ilk ve son TR gununu yil ile yazar', () => {
  expect(formatAralik('2026-08-25T08:00:00Z', '2026-09-10T08:00:00Z', 'tr')).toBe('25 Ağu – 10 Eyl 2026');
  // M1 (review bulgusu): yillar FARKLIYSA ("2027" yalnizca sonda yazilirsa ilk tarihin de 2027'de
  // oldugu sanilir) ilk tarih de kendi yiliyla yazilir.
  expect(formatAralik('2026-12-20T08:00:00Z', '2027-01-05T08:00:00Z', 'tr')).toBe('20 Ara 2026 – 5 Oca 2027');
});

test('formatFark isaretli ve TR ondalikli yazar', () => {
  expect(formatFark(2.5, 'tr')).toBe('+2,5');
  expect(formatFark(-32.5, 'tr')).toBe('−32,5');
  expect(formatFark(0, 'tr')).toBe('0');
});

test('Ingilizce tarih ay adiyla ve TR gunune gore yazilir', () => {
  // UTC 21:30 -> TR 00:30, ERTESI GUN -- dil degisince gun kaymaz.
  expect(formatTarih('2026-03-10T21:30:00Z', 'en')).toBe('11 Mar 2026');
  expect(formatKisaTarih('2026-09-12T08:00:00Z', 'en')).toBe('12 Sep');
  expect(formatAralik('2026-08-25T08:00:00Z', '2026-09-10T08:00:00Z', 'en')).toBe('25 Aug – 10 Sep 2026');
  expect(formatAralik('2026-12-20T08:00:00Z', '2027-01-05T08:00:00Z', 'en')).toBe('20 Dec 2026 – 5 Jan 2027');
});

test('Ingilizce sayilar nokta ondalikla yazilir', () => {
  expect(formatWeight(61.25, 'en')).toBe('61.25');
  expect(formatWeight(80, 'en')).toBe('80');
  expect(formatFark(-32.5, 'en')).toBe('−32.5');
});

describe('formatGoreliTarih (issue #218)', () => {
  const SIMDI = new Date('2026-09-14T12:00:00Z');

  test('1 dakikadan az gecmisse "az once" doner', () => {
    expect(formatGoreliTarih('2026-09-14T11:59:30Z', 'tr', SIMDI)).toBe('az önce');
    expect(formatGoreliTarih('2026-09-14T11:59:30Z', 'en', SIMDI)).toBe('just now');
  });

  test('1 saatin altinda dakika bazinda gosterir', () => {
    expect(formatGoreliTarih('2026-09-14T11:48:00Z', 'tr', SIMDI)).toBe('12 dakika önce');
    expect(formatGoreliTarih('2026-09-14T11:59:00Z', 'tr', SIMDI)).toBe('1 dakika önce');
    expect(formatGoreliTarih('2026-09-14T11:48:00Z', 'en', SIMDI)).toBe('12 minutes ago');
    expect(formatGoreliTarih('2026-09-14T11:59:00Z', 'en', SIMDI)).toBe('1 minute ago');
  });

  test('24 saatin altinda saat bazinda gosterir', () => {
    expect(formatGoreliTarih('2026-09-14T09:00:00Z', 'tr', SIMDI)).toBe('3 saat önce');
    expect(formatGoreliTarih('2026-09-14T11:00:00Z', 'tr', SIMDI)).toBe('1 saat önce');
    expect(formatGoreliTarih('2026-09-14T09:00:00Z', 'en', SIMDI)).toBe('3 hours ago');
    expect(formatGoreliTarih('2026-09-14T11:00:00Z', 'en', SIMDI)).toBe('1 hour ago');
  });

  test('tam 24 saat ve sonrasinda mutlak tarihe doner', () => {
    // UTC 12:00, 13 Eylul -> TR 15:00, 13 Eylul.
    expect(formatGoreliTarih('2026-09-13T12:00:00Z', 'tr', SIMDI)).toBe(formatTarih('2026-09-13T12:00:00Z', 'tr'));
    expect(formatGoreliTarih('2026-09-01T08:00:00Z', 'tr', SIMDI)).toBe(formatTarih('2026-09-01T08:00:00Z', 'tr'));
  });
});
