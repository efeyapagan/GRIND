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
