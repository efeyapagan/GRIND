import { expect, test } from 'vitest';
import { arkadaslariSirala, hedefOrani, type ArkadasHaftasi } from './arkadasSiralamasi';

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
    ...kismi,
  };
}

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

test('orana gore yuksekten dusuge siralanir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'dusuk', trainedDaysThisWeek: 1, weeklyTargetDays: 4 }),
    arkadas({ username: 'yuksek', trainedDaysThisWeek: 3, weeklyTargetDays: 4 }),
    arkadas({ username: 'orta', trainedDaysThisWeek: 2, weeklyTargetDays: 4 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['yuksek', 'orta', 'dusuk']);
});

/** Kullanici karari: hedefi olmayan listede KALIR ama hedefi olanlardan SONRA gelir. */
test('hedefi olmayanlar en sonda', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'hedefsizCok', trainedDaysThisWeek: 6 }),
    arkadas({ username: 'hedefliAz', trainedDaysThisWeek: 1, weeklyTargetDays: 7 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['hedefliAz', 'hedefsizCok']);
});

test('hedefsizler kendi aralarinda gun sayisina gore siralanir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'bir', trainedDaysThisWeek: 1 }),
    arkadas({ username: 'uc', trainedDaysThisWeek: 3 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['uc', 'bir']);
});

test('esit oranda cok gun yapan ustte', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'az', trainedDaysThisWeek: 1, weeklyTargetDays: 2 }),
    arkadas({ username: 'cok', trainedDaysThisWeek: 3, weeklyTargetDays: 6 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['cok', 'az']);
});

test('her sey esitse ada gore alfabetik -- sira kararli kalir', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'zeynep', trainedDaysThisWeek: 2, weeklyTargetDays: 4 }),
    arkadas({ username: 'ahmet', trainedDaysThisWeek: 2, weeklyTargetDays: 4 }),
  ]);

  expect(sirali.map((a) => a.username)).toEqual(['ahmet', 'zeynep']);
});

/** Lider yalnizca EN USTTEKI ve yalnizca gercekten antrenman yaptiysa. */
test('lider en ustteki, hic antrenman yoksa lider yok', () => {
  const sirali = arkadaslariSirala([
    arkadas({ username: 'a', trainedDaysThisWeek: 2, weeklyTargetDays: 4 }),
    arkadas({ username: 'b', trainedDaysThisWeek: 1, weeklyTargetDays: 4 }),
  ]);
  expect(sirali[0].username).toBe('a');

  const bos = arkadaslariSirala([arkadas({ username: 'a' }), arkadas({ username: 'b' })]);
  expect(bos.every((satir) => satir.trainedDaysThisWeek === 0)).toBe(true);
});

test('bos liste bos doner ve girdi degistirilmez', () => {
  const girdi = [arkadas({ username: 'a' })];
  const sirali = arkadaslariSirala(girdi);
  expect(arkadaslariSirala([])).toEqual([]);
  expect(sirali).not.toBe(girdi);
});
