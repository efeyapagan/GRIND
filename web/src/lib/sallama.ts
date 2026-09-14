import { useEffect } from 'react';

export interface Ivme {
  x: number;
  y: number;
  z: number;
}

/**
 * Kasitli bir sallamayi normal el hareketinden ayiran esik (m/s^2). Telefonu cebe koyarken ya da
 * yururken olusan degisim bunun altinda kalir; bilerek silkelemek rahatca asar.
 */
export const SALLAMA_ESIGI = 25;

/** Iki olcum arasindaki bekleme: her olcumu islemek gereksiz, cihaz ~60 Hz orneklyor. */
const ORNEK_ARALIGI_MS = 100;

/** Art arda sallama sayilmasin diye iki tetikleme arasindaki en kisa sure. */
const TEKRAR_BEKLEMESI_MS = 1000;

/**
 * Iki olcum arasindaki ivme degisiminin buyuklugu. Yer cekimi DAHIL okunan degerler kullanilir
 * (`accelerationIncludingGravity`): bazi cihazlarda yer cekimsiz `acceleration` hep null doner.
 * Bakilan sey FARK oldugu icin sabit yer cekimi bileseni zaten kendiliginden dusulur.
 */
export function ivmeFarki(onceki: Ivme, simdiki: Ivme): number {
  const dx = simdiki.x - onceki.x;
  const dy = simdiki.y - onceki.y;
  const dz = simdiki.z - onceki.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function sallamaMi(onceki: Ivme, simdiki: Ivme, esik: number = SALLAMA_ESIGI): boolean {
  return ivmeFarki(onceki, simdiki) > esik;
}

/**
 * iOS 13+ hareket sensoru icin ACIK izin ister ve bu izin yalnizca bir kullanici hareketi
 * icinden istenebilir. Cagrildigi yer bu yuzden silme ONAYIDIR (gercek bir dokunus).
 *
 * Sonuc BEKLENMEZ ve hicbir seyi bloklamaz: izin reddedilse de, API hic bulunmasa da (Android,
 * masaustu) geri alma seridi calismaya devam eder -- sallama yalnizca fazladan bir kolayliktir,
 * tek yol degildir.
 */
export async function sallamaIzniIste(): Promise<boolean> {
  const olay = window.DeviceMotionEvent as
    | (typeof window.DeviceMotionEvent & { requestPermission?: () => Promise<PermissionState> })
    | undefined;
  if (typeof olay?.requestPermission !== 'function') {
    // Izin kavrami yok (Android/masaustu): sensor varsa zaten dinlenebilir.
    return true;
  }
  try {
    return (await olay.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/**
 * `etkin` oldugu surece cihazin sallanmasini dinler ve `onSallama`yi cagirir (issue #46:
 * "telefonu sallayinca geri al"). Yalnizca geri alma penceresi acikken dinlenir -- surekli
 * acik bir sensor dinleyicisi pil yakar ve alakasiz anlarda tetiklenir.
 */
export function useSallama(etkin: boolean, onSallama: () => void): void {
  useEffect(() => {
    if (!etkin || typeof window.DeviceMotionEvent === 'undefined') {
      return;
    }

    let onceki: Ivme | null = null;
    let sonOrnekMs = 0;
    let sonSallamaMs = 0;

    function dinleyici(olay: DeviceMotionEvent) {
      const olculen = olay.accelerationIncludingGravity;
      if (!olculen || olculen.x === null || olculen.y === null || olculen.z === null) {
        return;
      }
      const simdi = Date.now();
      if (simdi - sonOrnekMs < ORNEK_ARALIGI_MS) {
        return;
      }
      sonOrnekMs = simdi;

      const simdiki: Ivme = { x: olculen.x, y: olculen.y, z: olculen.z };
      if (onceki && sallamaMi(onceki, simdiki) && simdi - sonSallamaMs > TEKRAR_BEKLEMESI_MS) {
        sonSallamaMs = simdi;
        onSallama();
      }
      onceki = simdiki;
    }

    window.addEventListener('devicemotion', dinleyici);
    return () => window.removeEventListener('devicemotion', dinleyici);
  }, [etkin, onSallama]);
}
