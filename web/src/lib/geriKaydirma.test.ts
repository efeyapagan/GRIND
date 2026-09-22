import { geriGidilsinMi, geriHedefi, kenardanMi, yonKarari } from './geriKaydirma';

/**
 * #232: sol kenardan saga kaydirarak geri donme karari -- web ve mobil ayni saf fonksiyonlari
 * kullanir (packages/shared/src/lib/geriKaydirma.ts).
 */

test('hareket yalnizca sol kenar seridinden baslayabilir', () => {
  expect(kenardanMi(32)).toBe(true);
  expect(kenardanMi(33)).toBe(false);
});

test('esigin altindaki hareket henuz yon belirlemez', () => {
  expect(yonKarari(6, 4)).toBe('bekle');
});

test('saga agir basan hareket geri, dikey ya da sola hareket o dokunusu disarida birakir', () => {
  expect(yonKarari(30, 8)).toBe('geri');
  // Dikey kaydirma bozulmamali.
  expect(yonKarari(8, 30)).toBe('yok');
  expect(yonKarari(-30, 2)).toBe('yok');
  // Esitlik karasizdir, sayfa kaydirmasi lehine yorumlanir.
  expect(yonKarari(12, 12)).toBe('yok');
});

test('genisligin %30u ya da yeterli hiz geri gider, ikisi de yoksa sayfa yerine oturur', () => {
  expect(geriGidilsinMi(120, 0, 400)).toBe(true);
  expect(geriGidilsinMi(119, 0, 400)).toBe(false);
  // Kisa ama hizli bir firlatma yeter.
  expect(geriGidilsinMi(40, 500, 400)).toBe(true);
  // Parmak sola donmusse hiz ne olursa olsun geri gidilmez.
  expect(geriGidilsinMi(-10, 900, 400)).toBe(false);
});

test('Ana Sayfada hareket kapali, gecmis varsa geri, yoksa Ana Sayfaya', () => {
  expect(geriHedefi('/', true)).toBe('yok');
  expect(geriHedefi('/profile/history', true)).toBe('geri');
  expect(geriHedefi('/profile/history', false)).toBe('anaSayfa');
});
