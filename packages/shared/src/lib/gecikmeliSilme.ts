import { useCallback, useEffect, useRef, useState } from 'react';

/** Geri alma penceresi. Fark edip tepki vermeye yeter, akisi bekletecek kadar uzun degil. */
export const GERI_AL_MS = 5000;

export interface GecikmeliSilme<T> {
  /** Silinmesi istenen ama henuz silinmemis oge; ekrandan gizlenmelidir. */
  bekleyen: T | null;
  baslat: (oge: T) => void;
  geriAl: () => void;
  sureDoldu: () => void;
}

/**
 * Geri alinabilir silme (issue #46 antrenman, #57 set -- ortak). `baslat` ogeyi BEKLEYEN yapar; gercek
 * silme (`tamamla`) ancak geri alma penceresi kapaninca (`sureDoldu`), yeni bir silme baslayinca ya da
 * bilesen kaldirilinca calisir.
 *
 * Sebep teknik ve baglayici: API silinmis bir kaydi GERI GETIREMEZ (antrenman setleriyle birlikte,
 * set ise ayni zaman damgasi ve rekor sirasiyla), yani "once sil, geri alinirsa yeniden olustur"
 * durust degil. Tek durust geri alma, silmeyi henuz yapmamis olmaktir.
 *
 * Pencere acikken bilesen kaldirilirsa (baska sekmeye gecis) silme IPTAL EDILMEZ, tamamlanir:
 * kullanici "sildim" dedi, geri almadi.
 *
 * Bekleyen oge bir ref'te de tutulur ve ref YALNIZCA olay isleyicilerinde yazilir: kaldirma temizleyicisi
 * guncel degeri okuyabilsin, `tamamla` da bir `setState` guncelleyicisinin icinde cagrilmasin (StrictMode
 * guncelleyicileri iki kez calistirir, bu da istegi iki kez atardi).
 *
 * `tamamla` KARARLI olmali (`useCallback`): temizleyicinin bagimligidir, kimligi degisirse silme erken
 * tamamlanir.
 */
export function useGecikmeliSilme<T>(tamamla: (oge: T) => void): GecikmeliSilme<T> {
  const [bekleyen, setBekleyen] = useState<T | null>(null);
  const bekleyenRef = useRef<T | null>(null);

  useEffect(
    () => () => {
      const kalan = bekleyenRef.current;
      if (kalan !== null) {
        bekleyenRef.current = null;
        tamamla(kalan);
      }
    },
    [tamamla],
  );

  const baslat = useCallback(
    (oge: T) => {
      // Onceki bekleyen silme varsa once o tamamlanir: ayni anda tek bir geri alma penceresi olur.
      const onceki = bekleyenRef.current;
      bekleyenRef.current = oge;
      setBekleyen(oge);
      if (onceki !== null) {
        tamamla(onceki);
      }
    },
    [tamamla],
  );

  const geriAl = useCallback(() => {
    bekleyenRef.current = null;
    setBekleyen(null);
  }, []);

  const sureDoldu = useCallback(() => {
    const onceki = bekleyenRef.current;
    bekleyenRef.current = null;
    setBekleyen(null);
    if (onceki !== null) {
      tamamla(onceki);
    }
  }, [tamamla]);

  return { bekleyen, baslat, geriAl, sureDoldu };
}
