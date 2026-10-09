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

// ---- #174 dilim 3: cevrimdisi sablon islemleri ----

const sablonOlustur: BekleyenIslem = {
  tur: 'sablonOlustur', anahtar: 't1', sablonId: -50, name: 'Leg Day',
  exercises: [{ exerciseId: 3, plannedSets: 3, restSeconds: 90 }],
};

test('gonderilmemis sablona duzenleme bekleyen olusturmayi gunceller', () => {
  const kuyruk = kuyrugaEkle([sablonOlustur], {
    tur: 'sablonGuncelle', anahtar: 't2', sablonId: -50, name: 'Leg Day B', exercises: [],
  });

  expect(kuyruk).toHaveLength(1);
  expect(kuyruk[0]).toMatchObject({ tur: 'sablonOlustur', name: 'Leg Day B', exercises: [] });
});

/** Silinen sablonla baslatilmis bekleyen antrenman korunur, sablonsuz olur (sunucudaki SET NULL gibi). */
test('gonderilmemis sablon silinince olusturmasi duser, onunla baslatilan antrenman sablonsuz kalir', () => {
  const kuyruk = kuyrugaEkle(
    [
      sablonOlustur,
      { tur: 'sablonSabitle', anahtar: 't3', sablonId: -50, isPinned: true },
      { tur: 'oturumBaslat', anahtar: 'a1', oturumId: -1, templateId: -50, startedAt: '2026-10-04T10:00:00Z' },
    ],
    { tur: 'sablonSil', anahtar: 't4', sablonId: -50 },
  );

  expect(kuyruk).toEqual([
    { tur: 'oturumBaslat', anahtar: 'a1', oturumId: -1, templateId: null, startedAt: '2026-10-04T10:00:00Z' },
  ]);
});

test('sunucudaki sablonun duzenleme, silme, siralama ve sabitlemesi kuyruga normal islem olarak girer', () => {
  let kuyruk = kuyrugaEkle([], { tur: 'sablonGuncelle', anahtar: 'u1', sablonId: 7, name: 'Push', exercises: [] });
  kuyruk = kuyrugaEkle(kuyruk, { tur: 'sablonSirala', anahtar: 'u2', templateIds: [7, 8] });
  kuyruk = kuyrugaEkle(kuyruk, { tur: 'sablonSabitle', anahtar: 'u3', sablonId: 8, isPinned: true });
  kuyruk = kuyrugaEkle(kuyruk, { tur: 'sablonSil', anahtar: 'u4', sablonId: 7 });

  expect(kuyruk.map((islem) => islem.tur)).toEqual(['sablonGuncelle', 'sablonSirala', 'sablonSabitle', 'sablonSil']);
});

test('gecici sablon kimligi gercekle degisince baslatma, siralama ve sablon islemleri gercegi kullanir', () => {
  const kuyruk = kimlikEsle(
    [
      { tur: 'oturumBaslat', anahtar: 'a1', oturumId: -1, templateId: -50, startedAt: '2026-10-04T10:00:00Z' },
      { tur: 'sablonSirala', anahtar: 'u2', templateIds: [7, -50] },
      { tur: 'sablonSabitle', anahtar: 'u3', sablonId: -50, isPinned: false },
    ],
    'sablon',
    -50,
    12,
  );

  expect(kuyruk[0]).toMatchObject({ templateId: 12 });
  expect(kuyruk[1]).toMatchObject({ templateIds: [7, 12] });
  expect(kuyruk[2]).toMatchObject({ sablonId: 12 });
});

// ---- Antrenmandan kaydedilen sablon (#662) ----

const antrenmandanSablon: BekleyenIslem = {
  tur: 'sablonOlustur', anahtar: 't9', sablonId: -70, name: 'Bugunku', exercises: [], baglananOturumId: -1,
};

/** Cevrimdisi baslatilan antrenmandan kaydedilen sablon, antrenman sunucuda olusunca GERCEK kimligine baglanir. */
test('gecici antrenman kimligi gercekle degisince ondan kaydedilen sablon gercek antrenmana baglanir', () => {
  const kuyruk = kimlikEsle([antrenmandanSablon], 'oturum', -1, 501);

  expect(kuyruk[0]).toMatchObject({ tur: 'sablonOlustur', baglananOturumId: 501 });
});

/** Antrenman iptal edilse de kullanicinin kaydettigi sablon KALIR; yalnizca hic olusmayacak antrenmana baglanmaz. */
test('cevrimdisi antrenman iptal edilince ondan kaydedilen sablon kalir, bagi duser', () => {
  const kuyruk = kuyrugaEkle([baslat, setEkle(-10), antrenmandanSablon], { tur: 'oturumIptal', anahtar: 'i1', oturumId: -1 });

  expect(kuyruk).toHaveLength(1);
  expect(kuyruk[0]).toMatchObject({ tur: 'sablonOlustur', sablonId: -70 });
  expect((kuyruk[0] as { baglananOturumId?: number }).baglananOturumId).toBeUndefined();
});
