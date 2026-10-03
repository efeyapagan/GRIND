import { BASLANGIC_DURUMU, CEVRIMDISI_ESIGI_MS, ON_PLAN_TOLERANSI_MS, cevrimdisiMi, olay } from './baglantiDurumu';

// #174 (kullanici karari): "Cevrimdisi" seridi sunucudan 5 sn veri alinamazsa gorunur (anlik kopmalar
// gosterilmez); uygulama on plana donunce ilk 3 sn baglanti denenir, bu surede serit gosterilmez.

test('hic hata yokken cevrimici', () => {
  expect(cevrimdisiMi(BASLANGIC_DURUMU, 1_000_000)).toBe(false);
});

test('tek bir ag hatasi hemen cevrimdisi yapmaz', () => {
  const durum = olay(BASLANGIC_DURUMU, { tur: 'agHatasi', an: 0 });

  expect(cevrimdisiMi(durum, 3_000)).toBe(false);
});

test('ilk hatadan bu yana 5 sn yanit gelmezse cevrimdisi olur', () => {
  let durum = olay(BASLANGIC_DURUMU, { tur: 'agHatasi', an: 0 });
  durum = olay(durum, { tur: 'agHatasi', an: 2_000 });

  expect(cevrimdisiMi(durum, CEVRIMDISI_ESIGI_MS - 1)).toBe(false);
  expect(cevrimdisiMi(durum, CEVRIMDISI_ESIGI_MS)).toBe(true);
});

test('herhangi bir yanit sayaci sifirlar ve cevrimiciye dondurur', () => {
  let durum = olay(BASLANGIC_DURUMU, { tur: 'agHatasi', an: 0 });
  durum = olay(durum, { tur: 'yanit', an: 12_000 });

  expect(cevrimdisiMi(durum, 12_000)).toBe(false);
  // Yeni bir hata sayaci bastan baslatir.
  durum = olay(durum, { tur: 'agHatasi', an: 13_000 });
  expect(cevrimdisiMi(durum, 17_000)).toBe(false);
  expect(cevrimdisiMi(durum, 18_000)).toBe(true);
});

test('on plana donuste ilk 3 sn serit gosterilmez, sonra hala hata varsa gosterilir', () => {
  let durum = olay(BASLANGIC_DURUMU, { tur: 'agHatasi', an: 0 });
  expect(cevrimdisiMi(durum, 60_000)).toBe(true);

  durum = olay(durum, { tur: 'onPlanaDondu', an: 60_000 });

  expect(cevrimdisiMi(durum, 60_000 + ON_PLAN_TOLERANSI_MS - 1)).toBe(false);
  expect(cevrimdisiMi(durum, 60_000 + ON_PLAN_TOLERANSI_MS)).toBe(true);
});

test('on plana donuste 3 sn icinde yanit gelirse serit hic gorunmez', () => {
  let durum = olay(BASLANGIC_DURUMU, { tur: 'agHatasi', an: 0 });
  durum = olay(durum, { tur: 'onPlanaDondu', an: 60_000 });
  durum = olay(durum, { tur: 'yanit', an: 61_000 });

  expect(cevrimdisiMi(durum, 64_000)).toBe(false);
});
