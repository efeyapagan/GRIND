import { altEkranMi, geriGidilsinMi, geriHedefi, kenardanMi, profilAnaEkraniMi, yonKarari } from './geriKaydirma';

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

describe('altEkranMi (issue #255 -- ust basliktaki geri dugmesi)', () => {
  test('kok sekmeler ve Profilin kendi alt sekmeleri dugmeyi almaz', () => {
    expect(altEkranMi('/')).toBe(false);
    expect(altEkranMi('/antrenman')).toBe(false);
    expect(altEkranMi('/profile')).toBe(false);
    expect(altEkranMi('/profile/measurements')).toBe(false);
    expect(altEkranMi('/profile/history')).toBe(false);
    expect(altEkranMi('/profile/records')).toBe(false);
  });

  /** #283: Hesap artık bir sekme değil, başlıktaki düğmenin açtığı ekran -- düzenleme ekranı gibi. */
  test('hesap ayarlari ve profili duzenle alt ekran sayilir, dugmeyi alir', () => {
    expect(altEkranMi('/profile/account')).toBe(true);
    expect(altEkranMi('/profile/edit')).toBe(true);
  });

  test('sablonlar, GRINDY ve antrenman bitirme alt ekran sayilir, dugmeyi alir', () => {
    expect(altEkranMi('/templates')).toBe(true);
    expect(altEkranMi('/templates/new')).toBe(true);
    expect(altEkranMi('/templates/42')).toBe(true);
    expect(altEkranMi('/insights')).toBe(true);
    expect(altEkranMi('/antrenman/bitir')).toBe(true);
    expect(altEkranMi('/antrenman-bitir')).toBe(true);
  });
});

describe('profilAnaEkraniMi (issue #293 -- ust basliktaki hesap ayarlari kisayolu)', () => {
  test('Profilin kok ekranlarinda gorunur', () => {
    expect(profilAnaEkraniMi('/profile')).toBe(true);
    expect(profilAnaEkraniMi('/profile/history')).toBe(true);
    expect(profilAnaEkraniMi('/profile/records')).toBe(true);
    expect(profilAnaEkraniMi('/profile/measurements')).toBe(true);
  });

  test('Profilin alt ekranlarinda ve baska hicbir yolda gorunmez', () => {
    expect(profilAnaEkraniMi('/profile/account')).toBe(false);
    expect(profilAnaEkraniMi('/profile/edit')).toBe(false);
    expect(profilAnaEkraniMi('/profile/search')).toBe(false);
    // Baskasinin profili: web `/u/...`, mobil `/profile/u/...` -- ikisi de HARIC tutulmali.
    expect(profilAnaEkraniMi('/u/efe')).toBe(false);
    expect(profilAnaEkraniMi('/profile/u/efe')).toBe(false);
    expect(profilAnaEkraniMi('/')).toBe(false);
    expect(profilAnaEkraniMi('/antrenman')).toBe(false);
    expect(profilAnaEkraniMi('/templates')).toBe(false);
  });
});
