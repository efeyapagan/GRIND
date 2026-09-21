/**
 * Turkce katalog -- TEK dogruluk kaynagi (#177). `en.ts` bu nesnenin tipini tasir; eksik ya da
 * fazla anahtar `tsc -b`'de hata verir. Anahtar kurallari: docs/superpowers/plans/2026-09-21-coklu-dil-web.md.
 */
export const tr = {
  ortak: {
    yukleniyor: 'Yükleniyor...',
    kaydet: 'Kaydet',
    kapat: 'Kapat',
    kullaniciAdi: 'Kullanıcı adı',
    sifre: 'Şifre',
    sifreyiGoster: 'Şifreyi göster',
    kullaniciAdiGerekli: 'Kullanıcı adı gerekli.',
    sifreGerekli: 'Şifre gerekli.',
    sifreEnAz8Karakter: 'Şifre en az 8 karakter olmalı.',
    sifreEnFazla72Bayt: 'Şifre en fazla 72 bayt olabilir.',
    sifrelerEslesmiyor: 'Şifreler eşleşmiyor.',
    enAz8Karakter: 'En az 8 karakter',
    girisYap: 'Giriş yap',
    kayitOl: 'Kayıt ol',
    slogan: 'Güç antrenmanı günlüğü',
  },
  hatalar: {
    beklenmeyen: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
  },
  rekor: {
    agirlik: 'Ağırlık rekoru',
    tekrar: 'Tekrar rekoru',
  },
  setGirdisi: {
    agirlikGerekli: 'Ağırlık girilmeli.',
    agirlikSayiOlmali: 'Ağırlık geçerli bir sayı olmalı.',
    tekrarGerekli: 'Tekrar sayısı girilmeli.',
    tekrarTamSayiOlmali: 'Tekrar sayısı tam sayı olmalı.',
    rirTamSayiOlmali: 'RIR tam sayı olmalı.',
  },
  dil: {
    etiket: 'Dil',
    turkce: 'Türkçe',
    ingilizce: 'English',
  },
  kabuk: {
    gezinme: 'Ana gezinme',
    anaSayfa: 'Ana sayfa',
    antrenmanBaslat: 'Antrenman başlat',
    profil: 'Profil',
    acikTemayaGec: 'Açık temaya geç',
    koyuTemayaGec: 'Koyu temaya geç',
    profilSekmeleri: 'Profil sekmeleri',
    sekmeHesap: 'Hesap',
    sekmeGecmis: 'Geçmiş',
    sekmeOlcumler: 'Ölçüler',
    sekmeRekorlar: 'Rekorlar',
  },
  giris: {
    girisBasarisiz: 'Giriş başarısız',
    hatasi: 'Kullanıcı adı veya şifre hatalı.',
    hesabinYokMu: 'Hesabın yok mu?',
  },
  kayit: {
    kayitBasarisiz: 'Kayıt başarısız',
    aciklama: 'Ağırlıklarını ve gelişimini anlık takip etmeye başla.',
    kullaniciAdiDeseni:
      'Kullanıcı adı 3-50 karakter olmalı; yalnızca İngilizce harf, rakam, _ ve - içerebilir.',
    kullaniciAdiPlaceholder: 'ornek_kullanici',
    kullaniciAdiIpucu: '3–50 karakter (harf, rakam, _ ve -)',
    sifreTekrari: 'Şifre tekrarı',
    sifreTekrariniGoster: 'Şifre tekrarını göster',
    zatenHesabinVarMi: 'Zaten hesabın var mı?',
  },
  profil: {
    baslik: 'Hesap',
    guncellenemedi: 'Güncellenemedi',
    mevcutSifreGerekli: 'Mevcut şifre gerekli.',
    mevcutSifreYanlis: 'Mevcut şifre yanlış.',
    sifreDegistir: 'Şifre değiştir',
    sifrenGuncellendi: 'Şifren güncellendi.',
    mevcutSifre: 'Mevcut şifre',
    yeniSifre: 'Yeni şifre',
    yeniSifreTekrari: 'Yeni şifre tekrarı',
    yeniSifreTekrariniGoster: 'Yeni şifre tekrarını göster',
    antrenmanHedefi: 'Antrenman hedefi',
    cikisYap: 'Çıkış yap',
    haftalikHedef: 'Haftalık hedef',
    hedefYok: 'Hedef yok',
    haftadaGun_one: 'Haftada {{count}} gün',
    haftadaGun_other: 'Haftada {{count}} gün',
    hedefAlinamadi: 'Hedef alınamadı.',
    hedefKaydedilemedi: 'Hedef kaydedilemedi.',
  },
};

export type Katalog = typeof tr;
