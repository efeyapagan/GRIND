/**
 * #274: set paneli acilinca secili hareket karti gorunur alana hizalanir -- web'de alta yapisik
 * panelin USTUNE, mobilde (panel kartin icinde) ekranin gorunur kismina. Iki platform ayni kurali
 * kullanir; olcumu (DOM rect / RN measure) platform yapar, bu fonksiyon yalnizca karar verir.
 */

/** Kart ile alanin kenari arasinda birakilan bosluk (px). */
export const KART_BOSLUGU = 12;

export interface DikeyAralik {
  ust: number;
  alt: number;
}

/**
 * Karti `alan` icine almak icin gereken kaydirma (px; pozitif = icerik yukari kayar, sayfa asagi
 * iner). Kart zaten gorunuyorsa 0. Kart alana sigmiyorsa ustu onceliklidir: hareketin adi gorunsun.
 */
export function kartHizalamaKaydirmasi(kart: DikeyAralik, alan: DikeyAralik): number {
  const ustSinir = alan.ust + KART_BOSLUGU;
  const altSinir = alan.alt - KART_BOSLUGU;
  if (kart.ust < ustSinir || kart.alt - kart.ust > altSinir - ustSinir) {
    return kart.ust - ustSinir;
  }
  if (kart.alt > altSinir) {
    return kart.alt - altSinir;
  }
  return 0;
}
