import type { HareketIlerlemesi } from '../api/queries';

/**
 * Backend'deki `TemplateExercise.DefaultRestSeconds` ile AYNI deger (spec Karar 1 ve 6): yeni sablon
 * satirinin dinlenmesi ve sablonda olmayan hareketin sayac suresi. Degisirse ikisi birlikte degisir.
 */
export const VARSAYILAN_DINLENME_SN = 90;

export const EK_SURE_SN = 15;

/**
 * Sayac durumu yalnizca bitis ani ve toplam sureden ibarettir (spec Karar 6): kalan sure her an
 * `Date.now()`'dan hesaplanir, boylece sekme arka plandan donunce dogru gorunur. Baslangic ani
 * `bitisMs - toplamMs`dir.
 */
export interface Dinlenme {
  bitisMs: number;
  toplamMs: number;
}

export function dinlenmeBaslat(simdiMs: number, saniye: number): Dinlenme | null {
  if (saniye <= 0) {
    return null;
  }
  return { bitisMs: simdiMs + saniye * 1000, toplamMs: saniye * 1000 };
}

export function kalanMs(dinlenme: Dinlenme, simdiMs: number): number {
  return Math.max(0, dinlenme.bitisMs - simdiMs);
}

export function bittiMi(dinlenme: Dinlenme, simdiMs: number): boolean {
  return kalanMs(dinlenme, simdiMs) === 0;
}

export function sureEkle(dinlenme: Dinlenme, saniye: number): Dinlenme {
  return { bitisMs: dinlenme.bitisMs + saniye * 1000, toplamMs: dinlenme.toplamMs + saniye * 1000 };
}

export function gecenOran(dinlenme: Dinlenme, simdiMs: number): number {
  return Math.min(1, 1 - kalanMs(dinlenme, simdiMs) / dinlenme.toplamMs);
}

/** `m:ss`; saniye YUKARI yuvarlanir ki "0:00" ancak sure gercekten dolunca gorunsun. */
export function kalanSureMetni(ms: number): string {
  const toplamSaniye = Math.ceil(ms / 1000);
  const dakika = Math.floor(toplamSaniye / 60);
  const saniye = toplamSaniye % 60;
  return `${dakika}:${String(saniye).padStart(2, '0')}`;
}

/**
 * Eklenen setin hareketi sablondaysa onun `restSeconds`'i (0 = sayac yok), degilse (plan disi ya da
 * sablonsuz antrenman) varsayilan (spec Karar 6). Sure sunucunun ilerleme yanitindan okunur.
 */
export function dinlenmeSuresi(ilerleme: readonly HareketIlerlemesi[], exerciseId: number): number {
  return ilerleme.find((hareket) => hareket.exerciseId === exerciseId)?.restSeconds ?? VARSAYILAN_DINLENME_SN;
}
