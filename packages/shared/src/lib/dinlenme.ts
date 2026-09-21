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

/**
 * Dinlenme sayacinin kalici depoda (web: localStorage, mobil: expo-secure-store) sakladigi
 * anahtar -- her iki platform da AYNI anahtari kullanir, tek bir kayit yeter (issue #190):
 * ayni anda en fazla bir acik antrenmanin bir sayaci olabilir.
 */
export const DINLENME_DEPO_ANAHTARI = 'grind.dinlenme';

interface DinlenmeKaydi {
  sessionId: number;
  exerciseId: number;
  dinlenme: Dinlenme;
}

/** Kalici depoya yazilacak JSON -- hangi antrenmana ve harekete ait oldugu da tasinir ki
 * `dinlenmeKaydiAyristir` baska bir antrenman/harekete ait bir kaydi yanlislikla geri yuklemesin. */
export function dinlenmeKaydiUret(sessionId: number, exerciseId: number, dinlenme: Dinlenme): string {
  return JSON.stringify({ sessionId, exerciseId, dinlenme } satisfies DinlenmeKaydi);
}

/**
 * Kalici depodan okunan ham degeri gecerli baglamla (guncel oturum + hareket) dogrular. `null`
 * doner: kayit yok, bozuk, baska bir oturuma/harekete ait ya da suresi cotan dolmus (issue #190 --
 * "gecen sureyi sayma" mantigi GEREKMEZ, `bitisMs` mutlak zaman damgasi oldugu icin suresi dolmus
 * bir kayit basitce atilir).
 */
export function dinlenmeKaydiAyristir(
  ham: string | null,
  sessionId: number,
  exerciseId: number,
  simdiMs: number,
): Dinlenme | null {
  if (!ham) {
    return null;
  }
  let kayit: Partial<DinlenmeKaydi>;
  try {
    kayit = JSON.parse(ham);
  } catch {
    return null;
  }
  if (
    kayit.sessionId !== sessionId ||
    kayit.exerciseId !== exerciseId ||
    typeof kayit.dinlenme?.bitisMs !== 'number' ||
    typeof kayit.dinlenme?.toplamMs !== 'number'
  ) {
    return null;
  }
  return bittiMi(kayit.dinlenme, simdiMs) ? null : kayit.dinlenme;
}
