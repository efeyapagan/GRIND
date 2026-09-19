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
