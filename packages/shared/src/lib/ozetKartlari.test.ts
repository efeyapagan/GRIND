import { expect, test } from 'vitest';
import { hedefCubugu, hedefKalan, seriCubugu } from './ozetKartlari';

/**
 * #544 (kullanici karari): ana sayfadaki iki ozet kartinin dikey cubugu. Seri cubugu mevcut seriyi
 * SIMDIYE KADARKI EN UZUN seriyle, hedef cubugu bu haftaki gunu haftalik HEDEFLE karsilastirir.
 * Deger 0..1 -- cubugun dolu kismi.
 */
test('seri cubugu mevcut seriyi en uzun seriye oranlar', () => {
  expect(seriCubugu(1, 4)).toBe(0.25);
  // En uzun seriye ulasmak = rekordasin: cubuk dolu.
  expect(seriCubugu(4, 4)).toBe(1);
});

test('hic seri yoksa seri cubugu bostur, bolme hatasi olmaz', () => {
  expect(seriCubugu(0, 0)).toBe(0);
});

test('hedef cubugu bu haftaki gunu hedefe oranlar, hedefi asmak cubugu tasirmaz', () => {
  expect(hedefCubugu(2, 4)).toBe(0.5);
  expect(hedefCubugu(6, 4)).toBe(1);
});

/** Hedef koymamis kullanicinin karsilastiracak bir seyi yok: cubuk yok (0 degil). */
test('hedef yoksa hedef cubugu yoktur', () => {
  expect(hedefCubugu(2, null)).toBeNull();
});

test('hedefe kalan gun sifirin altina inmez', () => {
  expect(hedefKalan(1, 4)).toBe(3);
  expect(hedefKalan(5, 4)).toBe(0);
});
