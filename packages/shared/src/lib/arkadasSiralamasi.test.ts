import { expect, test } from 'vitest';
import {
  AGIRLIKLAR,
  arkadaslariSirala,
  hedefOrani,
  siralamaPuani,
  type ArkadasHaftasi,
} from './arkadasSiralamasi';

function arkadas(kismi: Partial<ArkadasHaftasi> & { username: string }): ArkadasHaftasi {
  return {
    displayName: null,
    hasAvatar: false,
    avatarVersion: null,
    trainedDaysThisWeek: 0,
    weeklyTargetDays: null,
    trainedToday: false,
    weeklySetCount: 0,
    weeklyVolume: 0,
    isSelf: false,
    ...kismi,
  };
}

const enYuksek = { hacim: 1000, gun: 5 };

test('hedefe ulasma orani gun/hedef', () => {
  expect(hedefOrani(arkadas({ username: 'a', trainedDaysThisWeek: 2, weeklyTargetDays: 4 }))).toBe(0.5);
});

/** Hedefi asmak orani 1'in USTUNE cikarmaz: cubuk tasmaz, siralama "kim daha cok asti"ya donmez. */
test('hedefi asan oran 1 ile sinirlanir', () => {
  expect(hedefOrani(arkadas({ username: 'a', trainedDaysThisWeek: 6, weeklyTargetDays: 4 }))).toBe(1);
});

test('hedefi olmayanin orani yoktur', () => {
  expect(hedefOrani(arkadas({ username: 'a', trainedDaysThisWeek: 3 }))).toBeNull();
});

// ---- Agirlikli puan (#430) ----

test('puan uc bilesenin agirlikli toplamidir', () => {
  const puan = siralamaPuani(
    arkadas({ username: 'a', trainedDaysThisWeek: 2, weeklyTargetDays: 4, weeklyVolume: 500 }),
    enYuksek,
  );

  // hedef 0.5*0.5 + hacim 0.5*0.3 + gun 0.4*0.2
  expect(puan).toBeCloseTo(0.5 * AGIRLIKLAR.hedef + 0.5 * AGIRLIKLAR.hacim + 0.4 * AGIRLIKLAR.gun, 10);
});

test('gruptaki en yuksek sifirsa o bilesen puana sifir katar', () => {
  const puan = siralamaPuani(
    arkadas({ username: 'a', trainedDaysThisWeek: 0, weeklyTargetDays: 4 }),
    { hacim: 0, gun: 0 },
  );

  expect(puan).toBe(0);
});

test('hedefi olmayanin hedef bileseni sifirdir ama hacmi puan katar', () => {
  const puan = siralamaPuani(arkadas({ username: 'a', weeklyVolume: 1000 }), enYuksek);

  expect(puan).toBeCloseTo(AGIRLIKLAR.hacim, 10);
});

// ---- Siralama ----

/**
 * #430'un asil derdi: ayni gun sayisinda, orani DUSUK ama hacmi belirgin yuksek olan kisi one
 * gecebilmeli. Eskiden `1/3` her zaman `1/4`un ustundeydi.
 */
test('esit gunde yuksek hacim dusuk orani gecebilir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'yuksekOran', trainedDaysThisWeek: 1, weeklyTargetDays: 3, weeklyVolume: 100 }),
    arkadas({ username: 'yuksekHacim', trainedDaysThisWeek: 1, weeklyTargetDays: 4, weeklyVolume: 5000 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['yuksekHacim', 'yuksekOran']);
});

/** Hacim farki kucukse hedef agirligi (0.5) baskin kalir -- vaat hala kisinin kendi hedefi. */
test('hacimler yakinsa yuksek oran ustte kalir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'dusukOran', trainedDaysThisWeek: 1, weeklyTargetDays: 4, weeklyVolume: 1100 }),
    arkadas({ username: 'yuksekOran', trainedDaysThisWeek: 1, weeklyTargetDays: 3, weeklyVolume: 1000 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['yuksekOran', 'dusukOran']);
});

test('cok gun yapan az gun yapanin ustunde', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'az', trainedDaysThisWeek: 1, weeklyTargetDays: 4, weeklyVolume: 1000 }),
    arkadas({ username: 'cok', trainedDaysThisWeek: 4, weeklyTargetDays: 4, weeklyVolume: 1000 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['cok', 'az']);
});

/** Kullanici karari (#418) korunur: hedefi olmayan, hacmi ne olursa olsun hedefi olanlardan sonra. */
test('hedefi olmayanlar hacmi yuksek olsa da en altta', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'hedefsizDev', weeklyVolume: 99999, trainedDaysThisWeek: 7 }),
    arkadas({ username: 'hedefliKucuk', trainedDaysThisWeek: 1, weeklyTargetDays: 7, weeklyVolume: 1 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['hedefliKucuk', 'hedefsizDev']);
});

test('hedefsizler kendi aralarinda puana gore siralanir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'azHacim', trainedDaysThisWeek: 2, weeklyVolume: 100 }),
    arkadas({ username: 'cokHacim', trainedDaysThisWeek: 2, weeklyVolume: 5000 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['cokHacim', 'azHacim']);
});

test('her sey esitse ada gore alfabetik -- sira kararli kalir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'zeynep', trainedDaysThisWeek: 2, weeklyTargetDays: 4, weeklyVolume: 100 }),
    arkadas({ username: 'ahmet', trainedDaysThisWeek: 2, weeklyTargetDays: 4, weeklyVolume: 100 }),
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
