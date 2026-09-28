import { expect, test } from 'vitest';
import {
  AGIRLIKLAR,
  AYLIK_HEDEF_CARPANI,
  arkadaslariSirala,
  donemHedefi,
  hedefOrani,
  liderKullaniciAdi,
  siralamaPuani,
  type ArkadasDonemi,
} from './arkadasSiralamasi';

function arkadas(kismi: Partial<ArkadasDonemi> & { username: string }): ArkadasDonemi {
  return {
    displayName: null,
    hasAvatar: false,
    avatarVersion: null,
    trainedDays: 0,
    weeklyTargetDays: null,
    trainedToday: false,
    setCount: 0,
    volume: 0,
    isSelf: false,
    ...kismi,
  };
}

const enYuksek = { hacim: 1000, gun: 5 };

test('hedefe ulasma orani gun/hedef', () => {
  expect(hedefOrani(arkadas({ username: 'a', trainedDays: 2, weeklyTargetDays: 4 }))).toBe(0.5);
});

/** Hedefi asmak orani 1'in USTUNE cikarmaz: cubuk tasmaz, siralama "kim daha cok asti"ya donmez. */
test('hedefi asan oran 1 ile sinirlanir', () => {
  expect(hedefOrani(arkadas({ username: 'a', trainedDays: 6, weeklyTargetDays: 4 }))).toBe(1);
});

test('hedefi olmayanin orani yoktur', () => {
  expect(hedefOrani(arkadas({ username: 'a', trainedDays: 3 }))).toBeNull();
});

// ---- Agirlikli puan (#430) ----

test('puan uc bilesenin agirlikli toplamidir', () => {
  const puan = siralamaPuani(
    arkadas({ username: 'a', trainedDays: 2, weeklyTargetDays: 4, volume: 500 }),
    enYuksek,
  );

  // hedef 0.5*0.5 + hacim 0.5*0.3 + gun 0.4*0.2
  expect(puan).toBeCloseTo(0.5 * AGIRLIKLAR.hedef + 0.5 * AGIRLIKLAR.hacim + 0.4 * AGIRLIKLAR.gun, 10);
});

test('gruptaki en yuksek sifirsa o bilesen puana sifir katar', () => {
  const puan = siralamaPuani(
    arkadas({ username: 'a', trainedDays: 0, weeklyTargetDays: 4 }),
    { hacim: 0, gun: 0 },
  );

  expect(puan).toBe(0);
});

test('hedefi olmayanin hedef bileseni sifirdir ama hacmi puan katar', () => {
  const puan = siralamaPuani(arkadas({ username: 'a', volume: 1000 }), enYuksek);

  expect(puan).toBeCloseTo(AGIRLIKLAR.hacim, 10);
});

// ---- Siralama ----

/**
 * #430'un asil derdi: ayni gun sayisinda, orani DUSUK ama hacmi belirgin yuksek olan kisi one
 * gecebilmeli. Eskiden `1/3` her zaman `1/4`un ustundeydi.
 */
test('esit gunde yuksek hacim dusuk orani gecebilir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'yuksekOran', trainedDays: 1, weeklyTargetDays: 3, volume: 100 }),
    arkadas({ username: 'yuksekHacim', trainedDays: 1, weeklyTargetDays: 4, volume: 5000 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['yuksekHacim', 'yuksekOran']);
});

/** Hacim farki kucukse hedef agirligi (0.5) baskin kalir -- vaat hala kisinin kendi hedefi. */
test('hacimler yakinsa yuksek oran ustte kalir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'dusukOran', trainedDays: 1, weeklyTargetDays: 4, volume: 1100 }),
    arkadas({ username: 'yuksekOran', trainedDays: 1, weeklyTargetDays: 3, volume: 1000 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['yuksekOran', 'dusukOran']);
});

test('cok gun yapan az gun yapanin ustunde', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'az', trainedDays: 1, weeklyTargetDays: 4, volume: 1000 }),
    arkadas({ username: 'cok', trainedDays: 4, weeklyTargetDays: 4, volume: 1000 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['cok', 'az']);
});

/** Kullanici karari (#418) korunur: hedefi olmayan, hacmi ne olursa olsun hedefi olanlardan sonra. */
test('hedefi olmayanlar hacmi yuksek olsa da en altta', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'hedefsizDev', volume: 99999, trainedDays: 7 }),
    arkadas({ username: 'hedefliKucuk', trainedDays: 1, weeklyTargetDays: 7, volume: 1 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['hedefliKucuk', 'hedefsizDev']);
});

test('hedefsizler kendi aralarinda puana gore siralanir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'azHacim', trainedDays: 2, volume: 100 }),
    arkadas({ username: 'cokHacim', trainedDays: 2, volume: 5000 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['cokHacim', 'azHacim']);
});

test('her sey esitse ada gore alfabetik -- sira kararli kalir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'zeynep', trainedDays: 2, weeklyTargetDays: 4, volume: 100 }),
    arkadas({ username: 'ahmet', trainedDays: 2, weeklyTargetDays: 4, volume: 100 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['ahmet', 'zeynep']);
});

test('hic antrenman yapilmamis grupta bolme hatasi yok', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'b', weeklyTargetDays: 3 }),
    arkadas({ username: 'a', weeklyTargetDays: 3 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['a', 'b']);
});

test('bos liste bos doner ve girdi degistirilmez', () => {
  const girdi = [arkadas({ username: 'a' })];
  const sirali = arkadaslariSirala(girdi);
  expect(arkadaslariSirala([])).toEqual([]);
  expect(sirali).not.toBe(girdi);
});

// ---- Lider (#488) ----

/**
 * #488: hafta basinda herkes sifirdayken listenin ilk satiri "lider" degildir -- henuz bir
 * kiyaslama YOKTUR. Taci sirf sirali listenin tepesinde durduğu icin vermek, alfabetik bir
 * esitligi basari gibi gosteriyordu.
 */
test('kimse antrenman yapmadiysa lider yoktur', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'a', weeklyTargetDays: 3 }),
    arkadas({ username: 'b', weeklyTargetDays: 4 }),
  ]);

  expect(liderKullaniciAdi(sirali)).toBeNull();
});

/** Kullanici karari: "biri antrenman yaparsa onunla birlikte kiyasa basla". */
test('tek kisi antrenman yaptiysa lider odur', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'calisan', trainedDays: 1, weeklyTargetDays: 4 }),
    arkadas({ username: 'duran', weeklyTargetDays: 3 }),
  ]);

  expect(liderKullaniciAdi(sirali)).toBe('calisan');
});

/**
 * Sira hedefi OLANLARI one alir; hedefsiz ama calisan biri, hedefli ama hic calismamis birinin
 * ALTINDA durabilir. Lider yine de calisan kisidir -- tac bir konum degil, bir emek isaretidir.
 */
test('lider sirali listenin ilki degil, calisan ilk kisidir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'hedefli', weeklyTargetDays: 3 }),
    arkadas({ username: 'hedefsiz', trainedDays: 2, volume: 500 }),
  ]);

  expect(sirali[0].username).toBe('hedefli');
  expect(liderKullaniciAdi(sirali)).toBe('hedefsiz');
});

/** Gun sayilmayacak kadar erken olabilir ama hacim varsa antrenman yapilmistir. */
test('yalnizca hacmi olan da lider olabilir', () => {
  expect(liderKullaniciAdi([arkadas({ username: 'a', volume: 120 })])).toBe('a');
});

test('bos listede lider yoktur', () => {
  expect(liderKullaniciAdi([])).toBeNull();
});

// ---- Donem (#420): takvim aylik gorunumdeyken hedef x4 ----

/**
 * Kullanici karari: aylik donemde karsilastirma hedefi haftalik hedefin 4 KATIDIR. (Bir takvim ayi
 * 4-5 Pazartesi-Pazar haftasi icerir; kullanici bu farki bilerek sabit x4'u secti.)
 */
test('aylik donemde hedef haftalik hedefin 4 katidir', () => {
  const kisi = arkadas({ username: 'a', weeklyTargetDays: 3 });

  expect(AYLIK_HEDEF_CARPANI).toBe(4);
  expect(donemHedefi(kisi, 'hafta')).toBe(3);
  expect(donemHedefi(kisi, 'ay')).toBe(12);
});

test('hedefsiz kisinin hicbir donemde hedefi yoktur', () => {
  expect(donemHedefi(arkadas({ username: 'a' }), 'ay')).toBeNull();
});

/** Ayni gun sayisi haftada hedefi DOLDURUR, ayda ancak yarisini. */
test('oran donemin hedefine gore hesaplanir', () => {
  const kisi = arkadas({ username: 'a', trainedDays: 6, weeklyTargetDays: 3 });

  expect(hedefOrani(kisi, 'hafta')).toBe(1);
  expect(hedefOrani(kisi, 'ay')).toBe(0.5);
});

/**
 * AYIRT EDICI: haftalik gorunumde ikisi de hedefini tamamladigi icin (oran 1) hacmi yuksek olan
 * ustte. Aylik gorunumde "hedefinin tamami" ile "yarisi" ayrisir ve siralama degisir.
 */
test('siralama donemin hedefine gore yapilir', () => {
  const liste = [
    // Hacimler YAKIN: aylikta oran farki (1 vs 0.5) hacim/gun farkiyla telafi edilemesin.
    arkadas({ username: 'yariHedef', trainedDays: 6, weeklyTargetDays: 3, volume: 1100 }),
    arkadas({ username: 'tamHedef', trainedDays: 4, weeklyTargetDays: 1, volume: 1000 }),
  ];

  expect(arkadaslariSirala(liste, 'hafta').map((a) => a.username)).toEqual(['yariHedef', 'tamHedef']);
  expect(arkadaslariSirala(liste, 'ay').map((a) => a.username)).toEqual(['tamHedef', 'yariHedef']);
});
