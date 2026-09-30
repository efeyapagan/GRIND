/**
 * Ana sayfadaki iki ozet kartinin dikey cubugu (#544, kullanici karari). Degerler 0..1 -- cubugun
 * dolu kismi. Saf: sayilar sunucudan (takvim ozeti) gelir, burada yalnizca oranlanir.
 */

/**
 * Mevcut haftalik seriyi SIMDIYE KADARKI EN UZUN seriyle karsilastirir. En uzun seriye ulasmak
 * cubugu doldurur (rekordasin). Hic seri yoksa bos -- sifira bolunmez.
 */
export function seriCubugu(mevcut: number, enUzun: number): number {
  return enUzun > 0 ? Math.min(1, mevcut / enUzun) : 0;
}

/**
 * Bu haftaki antrenman gununu haftalik HEDEFLE karsilastirir; hedefi asmak cubugu tasirmaz. Hedef
 * yoksa `null`: karsilastirilacak bir sey yoktur (0 degil -- "hic ilerlemedin" demek yanlis olurdu).
 */
export function hedefCubugu(gun: number, hedef: number | null): number | null {
  if (hedef === null || hedef <= 0) {
    return null;
  }
  return Math.min(1, gun / hedef);
}

/** Hedefe kalan gun; hedef asilmissa 0. */
export function hedefKalan(gun: number, hedef: number): number {
  return Math.max(0, hedef - gun);
}

/**
 * Seri REKORDA mi (#547): mevcut seri en uzun seriye esit -- kullanici her hafta rekorunu tazeliyor.
 * Hic seri yokken (0 = 0) rekor yoktur. Haftalik hedeften bagimsizdir (kullanici karari).
 */
export function rekordaMi(mevcut: number, enUzun: number): boolean {
  return mevcut > 0 && mevcut === enUzun;
}

/**
 * Haftalik hedef TUTTU mu (#547): bu haftaki gun hedefe ulasti ya da gecti. Hedef yoksa tutulacak bir
 * sey yoktur. Seriden bagimsizdir (kullanici karari).
 */
export function hedefTuttuMu(gun: number, hedef: number | null): boolean {
  return hedef !== null && hedef > 0 && gun >= hedef;
}
