import { useEffect, useState } from 'react';

/**
 * #647: akan kardiyonun sayaci icin "simdi" -- yalnizca `aktif`ken her saniye yenilenir. Sure baslangic anindan
 * hesaplanir (Kronometre ve dinlenme sayaciyla ayni ilke): uygulama arka plana gidip gelse de dogru kalir.
 */
export function useSaniyelikSaat(aktif: boolean): number {
  const [simdi, setSimdi] = useState(() => Date.now());
  useEffect(() => {
    if (!aktif) {
      return;
    }
    setSimdi(Date.now());
    const zamanlayici = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(zamanlayici);
  }, [aktif]);
  return simdi;
}
