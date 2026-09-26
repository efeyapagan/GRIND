import { expect, test } from 'vitest';
import { agirlikIbaresiAnahtari } from './agirlikIbaresi';

/**
 * #413: set girisinde "kg" kutusu tek tarafin mi toplamin mi agirligini istedigini soylemeli.
 * Yalnizca iki ekipman turu ibare gosterir; gerisi bugunku gibi sade kalir.
 */
test('dumbbell "Teki", makine "Toplam" ibaresini ister', () => {
  expect(agirlikIbaresiAnahtari('Dumbbell')).toBe('setGirdisi.ibareTeki');
  expect(agirlikIbaresiAnahtari('Machine')).toBe('setGirdisi.ibareToplam');
});

test('diger ekipmanlar ve ekipmani bilinmeyen hareket ibare istemez', () => {
  expect(agirlikIbaresiAnahtari('Barbell')).toBeNull();
  expect(agirlikIbaresiAnahtari('Cable')).toBeNull();
  expect(agirlikIbaresiAnahtari('Bodyweight')).toBeNull();
  expect(agirlikIbaresiAnahtari('Other')).toBeNull();
  // Kullanicinin kendi olusturdugu hareketin ekipmani yok (#413: yalnizca seed'de set edilir).
  expect(agirlikIbaresiAnahtari(null)).toBeNull();
  expect(agirlikIbaresiAnahtari(undefined)).toBeNull();
});
