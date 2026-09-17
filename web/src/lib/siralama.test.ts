import { anahtaraGoreTasi } from './siralama';

const LISTE = [{ anahtar: 1 }, { anahtar: 2 }, { anahtar: 3 }, { anahtar: 4 }];

test('ogeyi ileri tasir, aradakiler bir geri kayar', () => {
  expect(anahtaraGoreTasi(LISTE, 1, 3)).toEqual([{ anahtar: 2 }, { anahtar: 3 }, { anahtar: 1 }, { anahtar: 4 }]);
});

test('ogeyi geri tasir, aradakiler bir ileri kayar', () => {
  expect(anahtaraGoreTasi(LISTE, 4, 2)).toEqual([{ anahtar: 1 }, { anahtar: 4 }, { anahtar: 2 }, { anahtar: 3 }]);
});

test('bitisik ogeleri tasimak basit bir yer degistirmedir', () => {
  expect(anahtaraGoreTasi(LISTE, 2, 3)).toEqual([{ anahtar: 1 }, { anahtar: 3 }, { anahtar: 2 }, { anahtar: 4 }]);
});

test('ayni anahtar uzerine birakilirsa sira degismez ama yeni dizi dondurulur', () => {
  const sonuc = anahtaraGoreTasi(LISTE, 2, 2);
  expect(sonuc).toEqual(LISTE);
  expect(sonuc).not.toBe(LISTE);
});

test('olmayan bir anahtar verilirse liste degismeden dondurulur', () => {
  expect(anahtaraGoreTasi(LISTE, 99, 2)).toEqual(LISTE);
  expect(anahtaraGoreTasi(LISTE, 1, 99)).toEqual(LISTE);
});

test('bos liste guvenle ele alinir', () => {
  expect(anahtaraGoreTasi([], 1, 2)).toEqual([]);
});
