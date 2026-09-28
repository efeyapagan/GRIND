import { describe, expect, test } from 'vitest';
import {
  bittiMi,
  dinlenmeBaslat,
  dinlenmeKaydiAyristir,
  dinlenmeKaydiUret,
  dinlenmeSuresi,
  gecenOran,
  kalanMs,
  kalanSureMetni,
  sureEkle,
  VARSAYILAN_DINLENME_SN,
  duraklat,
  surdur,
  duraklatildiMi,
} from './dinlenme';

const T0 = 1_000_000;

test('sifir ya da negatif sure sayac baslatmaz', () => {
  expect(dinlenmeBaslat(T0, 0)).toBeNull();
  expect(dinlenmeBaslat(T0, -5)).toBeNull();
});

test('kalan sure bitis anindan hesaplanir ve sifirin altina inmez', () => {
  const d = dinlenmeBaslat(T0, 120)!;
  expect(kalanMs(d, T0)).toBe(120_000);
  expect(kalanMs(d, T0 + 30_000)).toBe(90_000);
  expect(bittiMi(d, T0 + 119_999)).toBe(false);
  expect(kalanMs(d, T0 + 500_000)).toBe(0);
  expect(bittiMi(d, T0 + 120_000)).toBe(true);
});

test('sure eklemek bitisi ve toplami birlikte uzatir', () => {
  const d = sureEkle(dinlenmeBaslat(T0, 60)!, 15);
  expect(kalanMs(d, T0)).toBe(75_000);
  expect(d.toplamMs).toBe(75_000);
});

test('kalan sure m:ss bicimindedir ve saniyeye yukari yuvarlanir', () => {
  expect(kalanSureMetni(90_000)).toBe('1:30');
  expect(kalanSureMetni(89_001)).toBe('1:30');
  expect(kalanSureMetni(5_000)).toBe('0:05');
  expect(kalanSureMetni(0)).toBe('0:00');
  expect(kalanSureMetni(300_000)).toBe('5:00');
});

test('gecen oran baslangicta 0, yarida 0.5, bitince 1', () => {
  const d = dinlenmeBaslat(T0, 100)!;
  expect(gecenOran(d, T0)).toBe(0);
  expect(gecenOran(d, T0 + 50_000)).toBe(0.5);
  expect(gecenOran(d, T0 + 200_000)).toBe(1);
});

test('dinlenme suresi sablondaki hareketten gelir, plan disinda varsayilandir', () => {
  const ilerleme = [
    { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 4, completedSets: 0, restSeconds: 180 },
    { exerciseId: 2, exerciseName: 'Squat', plannedSets: 3, completedSets: 0, restSeconds: 0 },
  ];
  expect(dinlenmeSuresi(ilerleme, 1)).toBe(180);
  expect(dinlenmeSuresi(ilerleme, 2)).toBe(0);
  expect(dinlenmeSuresi(ilerleme, 99)).toBe(VARSAYILAN_DINLENME_SN);
  expect(dinlenmeSuresi([], 1)).toBe(VARSAYILAN_DINLENME_SN);
});

describe('dinlenme kaydi (issue #190 -- kalici depo)', () => {
  test('eslesen oturum ve harekette, suresi dolmamis kayit geri yuklenir', () => {
    const d = dinlenmeBaslat(T0, 90)!;
    const ham = dinlenmeKaydiUret(7, 1, d);

    expect(dinlenmeKaydiAyristir(ham, 7, 1, T0 + 30_000)).toEqual(d);
  });

  test('farkli oturum icin kayit geri yuklenmez', () => {
    const ham = dinlenmeKaydiUret(7, 1, dinlenmeBaslat(T0, 90)!);

    expect(dinlenmeKaydiAyristir(ham, 8, 1, T0)).toBeNull();
  });

  test('farkli hareket icin kayit geri yuklenmez', () => {
    const ham = dinlenmeKaydiUret(7, 1, dinlenmeBaslat(T0, 90)!);

    expect(dinlenmeKaydiAyristir(ham, 7, 2, T0)).toBeNull();
  });

  test('suresi dolmus kayit geri yuklenmez', () => {
    const ham = dinlenmeKaydiUret(7, 1, dinlenmeBaslat(T0, 90)!);

    expect(dinlenmeKaydiAyristir(ham, 7, 1, T0 + 90_000)).toBeNull();
  });

  test('bos veya bozuk kayit guvenle yok sayilir', () => {
    expect(dinlenmeKaydiAyristir(null, 7, 1, T0)).toBeNull();
    expect(dinlenmeKaydiAyristir('{ bozuk json', 7, 1, T0)).toBeNull();
    expect(dinlenmeKaydiAyristir('{"sessionId":7}', 7, 1, T0)).toBeNull();
  });
});

// ---- Duraklatma (#477) ----

const AN = T0;

/** Bitirme ekranindayken sure akmamali: kalan, zaman gecse de sabit kalir. */
test('duraklatilmis sayacin kalani zaman gecse de degismez', () => {
  const dinlenme = duraklat(dinlenmeBaslat(AN, 90)!, AN + 30_000);

  expect(kalanMs(dinlenme, AN + 30_000)).toBe(60_000);
  expect(kalanMs(dinlenme, AN + 120_000)).toBe(60_000);
});

/** "Devam et" ile donulunce KALDIGI YERDEN surer: bitis ani duraklama kadar ileri kayar. */
test('surdurulen sayac kaldigi yerden devam eder', () => {
  const duraklatilmis = duraklat(dinlenmeBaslat(AN, 90)!, AN + 30_000);

  const surdurulen = surdur(duraklatilmis, AN + 200_000);

  expect(kalanMs(surdurulen, AN + 200_000)).toBe(60_000);
  expect(kalanMs(surdurulen, AN + 210_000)).toBe(50_000);
});

/** Duraklatilmis sayac "bitti" saymaz; yoksa geri donunce bitmis gorunurdu. */
test('duraklatilmis sayac beklerken bitmez', () => {
  const dinlenme = duraklat(dinlenmeBaslat(AN, 90)!, AN + 10_000);

  expect(bittiMi(dinlenme, AN + 10_000_000)).toBe(false);
});

/** Ilerleme cubugu da donar: duraklatilmisken oran sabit. */
test('duraklatilmisken oran sabit kalir', () => {
  const dinlenme = duraklat(dinlenmeBaslat(AN, 100)!, AN + 50_000);

  expect(gecenOran(dinlenme, AN + 50_000)).toBeCloseTo(0.5, 5);
  expect(gecenOran(dinlenme, AN + 900_000)).toBeCloseTo(0.5, 5);
});

/** Ekran iki kez odaklanabilir (ornegin geri/ileri); ikinci duraklatma kalani KAYDIRMAMALI. */
test('ikinci kez duraklatmak kalani degistirmez', () => {
  const bir = duraklat(dinlenmeBaslat(AN, 90)!, AN + 30_000);
  const iki = duraklat(bir, AN + 120_000);

  expect(kalanMs(iki, AN + 120_000)).toBe(60_000);
});

/** Duraklatilmamis bir sayaci surdurmek bir sey degistirmez (idempotent). */
test('duraklatilmamis sayaci surdurmek zararsizdir', () => {
  const dinlenme = dinlenmeBaslat(AN, 90)!;

  expect(surdur(dinlenme, AN + 30_000)).toEqual(dinlenme);
});

test('duraklatilmis mi sorusu dogru cevaplanir', () => {
  const calisan = dinlenmeBaslat(AN, 90)!;

  expect(duraklatildiMi(calisan)).toBe(false);
  expect(duraklatildiMi(duraklat(calisan, AN))).toBe(true);
});

/**
 * Uygulama duraklatilmisken kapanirsa kayit geri yuklenebilmeli: duraklatilmis bir sayac
 * "suresi dolmus" sayilip ATILMAMALI.
 */
test('duraklatilmis sayac kalici kayittan geri yuklenir', () => {
  const dinlenme = duraklat(dinlenmeBaslat(AN, 90)!, AN + 30_000);
  const ham = dinlenmeKaydiUret(7, 3, dinlenme);

  expect(dinlenmeKaydiAyristir(ham, 7, 3, AN + 10_000_000)).toEqual(dinlenme);
});
