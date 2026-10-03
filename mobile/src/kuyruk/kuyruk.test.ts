import { kimlikEsle, kuyrugaEkle, type BekleyenIslem } from './kuyruk';

// #174 dilim 2: cevrimdisi yapilan antrenman islemleri cihazda sirali bir kuyrukta bekler. Gecici (negatif)
// kimlikli kayitlar sunucuya hic gitmeden degisebilir/silinebilir: kuyruk bunlari sikistirir.

const baslat: BekleyenIslem = { tur: 'oturumBaslat', anahtar: 'a1', oturumId: -1, templateId: 7, startedAt: '2026-10-03T10:00:00Z' };
const setEkle = (setId: number, oturumId = -1): BekleyenIslem => ({
  tur: 'setEkle', anahtar: `s${setId}`, oturumId, setId, exerciseId: 3, weight: 60, reps: 8, rir: null, durationSeconds: null,
  createdAt: '2026-10-03T10:05:00Z',
});

test('islemler eklendikleri sirayla durur', () => {
  const kuyruk = kuyrugaEkle(kuyrugaEkle([], baslat), setEkle(-10));

  expect(kuyruk.map((islem) => islem.tur)).toEqual(['oturumBaslat', 'setEkle']);
});

test('gonderilmemis sete duzeltme bekleyen eklemeyi gunceller, yeni islem eklenmez', () => {
  const kuyruk = kuyrugaEkle([baslat, setEkle(-10)], {
    tur: 'setDuzelt', anahtar: 'd1', setId: -10, weight: 62.5, reps: 6, rir: 2, durationSeconds: null,
  });

  expect(kuyruk).toHaveLength(2);
  expect(kuyruk[1]).toMatchObject({ tur: 'setEkle', setId: -10, weight: 62.5, reps: 6, rir: 2 });
});

test('gonderilmemis set silinince bekleyen eklemesi de duser', () => {
  const kuyruk = kuyrugaEkle([baslat, setEkle(-10), setEkle(-11)], { tur: 'setSil', anahtar: 'x1', setId: -10 });

  expect(kuyruk.map((islem) => (islem.tur === 'setEkle' ? islem.setId : islem.tur))).toEqual(['oturumBaslat', -11]);
});

test('sunucudaki sete duzeltme ve silme kuyruga normal islem olarak girer', () => {
  let kuyruk = kuyrugaEkle([], { tur: 'setDuzelt', anahtar: 'd2', setId: 55, weight: 70, reps: 5, rir: null, durationSeconds: null });
  kuyruk = kuyrugaEkle(kuyruk, { tur: 'setSil', anahtar: 'x2', setId: 56 });

  expect(kuyruk.map((islem) => islem.tur)).toEqual(['setDuzelt', 'setSil']);
});

test('cevrimdisi baslatilan antrenman iptal edilince o antrenmanin hicbir islemi sunucuya gitmez', () => {
  const kuyruk = kuyrugaEkle(
    [
      baslat,
      setEkle(-10),
      { tur: 'hareketEkle', anahtar: 'h1', oturumId: -1, exerciseId: 9 },
      { tur: 'setDuzelt', anahtar: 'd3', setId: 77, weight: 1, reps: 1, rir: null, durationSeconds: null },
    ],
    { tur: 'oturumIptal', anahtar: 'i1', oturumId: -1 },
  );

  // Baska bir (sunucudaki) sete ait islem korunur.
  expect(kuyruk.map((islem) => islem.tur)).toEqual(['setDuzelt']);
});

test('sunucudaki antrenmanin iptali kuyruga normal islem olarak girer', () => {
  const kuyruk = kuyrugaEkle([setEkle(-10, 42)], { tur: 'oturumIptal', anahtar: 'i2', oturumId: 42 });

  expect(kuyruk.map((islem) => islem.tur)).toEqual(['setEkle', 'oturumIptal']);
});

test('gecici antrenman kimligi gercek kimlikle degisince sonraki islemler gercek kimligi kullanir', () => {
  const kuyruk = kimlikEsle(
    [setEkle(-10), { tur: 'oturumBitir', anahtar: 'b1', oturumId: -1, zorluk: 'Hard', endedAt: '2026-10-03T11:00:00Z' }],
    'oturum',
    -1,
    501,
  );

  expect(kuyruk[0]).toMatchObject({ oturumId: 501 });
  expect(kuyruk[1]).toMatchObject({ oturumId: 501 });
});

test('gecici set kimligi gercek kimlikle degisince duzeltme ve silme gercek kimligi kullanir', () => {
  const kuyruk = kimlikEsle(
    [
      { tur: 'setDuzelt', anahtar: 'd4', setId: -10, weight: 1, reps: 1, rir: null, durationSeconds: null },
      { tur: 'setSil', anahtar: 'x4', setId: -10 },
    ],
    'set',
    -10,
    900,
  );

  expect(kuyruk.map((islem) => ('setId' in islem ? islem.setId : null))).toEqual([900, 900]);
});
