import { acilirMi, kapanirMi, kararVerilebilir, yatayMi } from './kaydirma';

test('yon karari mutlak degerlere gore verilir', () => {
  expect(yatayMi(-40, 5)).toBe(true);
  // Dikey agir basiyorsa bu bir sayfa kaydirmasidir; karti acmamali.
  expect(yatayMi(-5, 40)).toBe(false);
  // Esitlikte yatay SAYILMAZ: karasiz bir hareket sayfa kaydirmasi lehine yorumlanir.
  expect(yatayMi(10, 10)).toBe(false);
});

test('esigin altindaki titresim yon karari icin yeterli degildir', () => {
  expect(kararVerilebilir(3, 3)).toBe(false);
  expect(kararVerilebilir(-8, 0)).toBe(true);
  expect(kararVerilebilir(0, 8)).toBe(true);
});

test('yalnizca yeterince sola gidis acar, yeterince saga gidis kapatir', () => {
  expect(acilirMi(-48)).toBe(true);
  expect(acilirMi(-47)).toBe(false);
  // Saga gidis ASLA acmaz.
  expect(acilirMi(80)).toBe(false);

  expect(kapanirMi(48)).toBe(true);
  expect(kapanirMi(47)).toBe(false);
  expect(kapanirMi(-80)).toBe(false);
});
