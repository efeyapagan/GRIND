/**
 * Basili tutup surukleyerek sira degistirme (issue #118 madde 3) icin saf yardimci. dnd-kit'in
 * `onDragEnd` olayindaki `active`/`over` kimlikleri, listedeki ogelerin kendi `anahtar` alaniyla
 * eslenir -- boylece surukleme sonucu, ok dugmelerinin (`tasi`) besledigi AYNI diziye yazilir,
 * ikinci bir sira kaynagi olusmaz. Dizi tasima mantigi burada, dnd-kit'ten bagimsiz test edilir:
 * jsdom'da gercek dokunmatik surukleme simule etmek guvenilir degil (bkz. test dosyasi).
 */
export interface Siralanabilir {
  anahtar: number;
}

export function anahtaraGoreTasi<T extends Siralanabilir>(
  liste: readonly T[],
  aktifAnahtar: number,
  hedefAnahtar: number,
): T[] {
  const eskiIndeks = liste.findIndex((oge) => oge.anahtar === aktifAnahtar);
  const yeniIndeks = liste.findIndex((oge) => oge.anahtar === hedefAnahtar);
  if (eskiIndeks === -1 || yeniIndeks === -1 || eskiIndeks === yeniIndeks) {
    return [...liste];
  }
  const yeni = [...liste];
  const [tasinan] = yeni.splice(eskiIndeks, 1);
  yeni.splice(yeniIndeks, 0, tasinan);
  return yeni;
}

/**
 * Yukari/asagi dugmeleri (#229; sablon formu ve antrenman, web + mobil): `indeks`teki ogeyi `yon`
 * yonundeki komsusuyla yer degistirir. Listenin disina tasima istenirse ayni icerikli yeni dizi doner.
 */
export function yonleTasi<T>(liste: readonly T[], indeks: number, yon: -1 | 1): T[] {
  const hedef = indeks + yon;
  const yeni = [...liste];
  if (indeks < 0 || indeks >= liste.length || hedef < 0 || hedef >= liste.length) {
    return yeni;
  }
  [yeni[indeks], yeni[hedef]] = [yeni[hedef], yeni[indeks]];
  return yeni;
}

/**
 * `anahtaraGoreTasi`nin indeksle calisan kardesi (#344): surukleme sirasinda elde anahtar degil
 * konum vardir. Ayni tasima mantigi -- oge cikarilir, hedef konuma sokulur, aradakiler kayar.
 */
export function indeksleTasi<T>(liste: readonly T[], eskiIndeks: number, yeniIndeks: number): T[] {
  const yeni = [...liste];
  if (eskiIndeks === yeniIndeks || eskiIndeks < 0 || eskiIndeks >= liste.length) {
    return yeni;
  }
  const [tasinan] = yeni.splice(eskiIndeks, 1);
  yeni.splice(yeniIndeks, 0, tasinan);
  return yeni;
}

/**
 * Basili tutup surukleyerek sira degistirme (#344, mobil): parmagin dikey otelemesini hedef
 * indekse cevirir. Suruklenen oge bir komsunun yerine, O KOMSUNUN yuksekliginin yarisini gectigi
 * anda gecer; sonuc listenin uclarina sabitlenir. Hesap jestten ayri durur: gercek surukleme testte
 * simule edilemez, ama bu formul edilebilir.
 *
 * `yukseklikler` her satirin kendi sirasidir (satir + aradaki bosluk) -- #407: antrenman kartlari
 * set sayisina gore uzar, esit boy varsayimi uzun bir kartin ustunden erken atlardi. Bir satir
 * henuz olculmediyse (0) hesap yapilamaz; oge yerinde birakilir.
 */
export function surukleHedefIndeksi(
  baslangicIndeksi: number,
  otelemeY: number,
  yukseklikler: readonly number[],
): number {
  if (yukseklikler.some((yukseklik) => !(yukseklik > 0))) {
    return baslangicIndeksi;
  }
  const yon = otelemeY < 0 ? -1 : 1;
  let kalan = Math.abs(otelemeY);
  let hedef = baslangicIndeksi;
  for (let komsu = baslangicIndeksi + yon; komsu >= 0 && komsu < yukseklikler.length; komsu += yon) {
    if (kalan < yukseklikler[komsu] / 2) {
      break;
    }
    hedef = komsu;
    kalan -= yukseklikler[komsu];
  }
  return hedef;
}
