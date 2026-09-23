import { basHarf, kareKirpma } from './profilFotografi';

/**
 * #283: fotoğraf yüklenmeden önce istemcide kare kırpılıp küçültülür. Kırpma görselin ORTASINDAN
 * alınır -- dikey bir fotoğrafta yüz genelde ortadadır; üstten kırpmak başı kesebilirdi.
 */
test('kare kirpma uzun kenari ortadan kisaltir', () => {
  expect(kareKirpma(400, 1000)).toEqual({ x: 0, y: 300, kenar: 400 });
  expect(kareKirpma(1200, 800)).toEqual({ x: 200, y: 0, kenar: 800 });
});

/** Fotoğraf yokken gösterilen baş harf, arayüz dilinin büyük harf kuralıyla yazılır ('i' -> 'İ'). */
test('bas harf arayuz dilinin buyuk harf kuraliyla yazilir', () => {
  expect(basHarf('ilker', 'tr')).toBe('İ');
  expect(basHarf('ilker', 'en')).toBe('I');
});
