/**
 * #174: "sunucuya ulasilabiliyor mu" durumunun saf mantigi -- saat disaridan verilir, test edilebilir.
 *
 * Kullanici karari: serit sunucudan 5 sn hic yanit alinamazsa gorunur (anlik kopmalar gosterilmez);
 * uygulama on plana donunce ilk 3 sn baglanti denenir ve bu surede serit gosterilmez. Herhangi bir
 * HTTP yaniti (4xx/5xx dahil) sunucuya ulasildi sayilir (bkz. `request()`).
 */

export const CEVRIMDISI_ESIGI_MS = 5_000;
export const ON_PLAN_TOLERANSI_MS = 3_000;

export interface BaglantiDurumu {
  /** Kesintisiz hata dizisinin ilk hatasinin ani; son yanittan beri hata yoksa `null`. */
  ilkHata: number | null;
  /** Uygulamanin en son on plana dondugu an. */
  onPlanaDonus: number | null;
}

export type BaglantiOlayi =
  | { tur: 'yanit'; an: number }
  | { tur: 'agHatasi'; an: number }
  | { tur: 'onPlanaDondu'; an: number };

export const BASLANGIC_DURUMU: BaglantiDurumu = { ilkHata: null, onPlanaDonus: null };

export function olay(durum: BaglantiDurumu, yeni: BaglantiOlayi): BaglantiDurumu {
  switch (yeni.tur) {
    case 'yanit':
      return { ...durum, ilkHata: null };
    case 'agHatasi':
      return { ...durum, ilkHata: durum.ilkHata ?? yeni.an };
    case 'onPlanaDondu':
      return { ...durum, onPlanaDonus: yeni.an };
  }
}

export function cevrimdisiMi(durum: BaglantiDurumu, an: number): boolean {
  if (durum.ilkHata === null) {
    return false;
  }
  if (durum.onPlanaDonus !== null && an - durum.onPlanaDonus < ON_PLAN_TOLERANSI_MS) {
    return false;
  }
  return an - durum.ilkHata >= CEVRIMDISI_ESIGI_MS;
}
