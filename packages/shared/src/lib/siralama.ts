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
 * indekse cevirir. Bir satirin YARISINI gecen her oteleme bir sira tasir (`Math.round`), sonuc
 * listenin uclarina sabitlenir. Hesap jestten ayri durur: gercek surukleme testte simule
 * edilemez, ama bu formul edilebilir.
 *
 * `satirYuksekligi` 0 ise (satir henuz olculmediyse) bolme NaN uretirdi; oge yerinde birakilir.
 */
export function surukleHedefIndeksi(
  baslangicIndeksi: number,
  otelemeY: number,
  satirYuksekligi: number,
  adet: number,
): number {
  if (satirYuksekligi <= 0) {
    return baslangicIndeksi;
  }
  const hedef = baslangicIndeksi + Math.round(otelemeY / satirYuksekligi);
  return Math.min(adet - 1, Math.max(0, hedef));
}
