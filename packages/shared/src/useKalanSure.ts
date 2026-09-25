import { useEffect, useState } from 'react';
import { bittiMi, gecenOran, kalanMs, kalanSureMetni, type Dinlenme } from './lib/dinlenme';

interface KalanSure {
  /** `m:ss`; sayac yokken ya da bitmisken `null` -- gosterge o zaman sureyi degil bitis halini cizer. */
  metin: string | null;
  bitti: boolean;
  /** Ilerleme cubugu icin 0–1; sayac yokken 0. */
  oran: number;
}

/**
 * Dinlenme sayacinin saniyede bir yenilenen turevleri. Saf hesaplama `lib/dinlenme.ts`'te; bu kanca
 * yalnizca zamani tikletir, boylece hem ust bari kaplayan genis panel hem de bara kucultulmus
 * gosterge AYNI kaynaktan beslenir (iki ayri `setInterval` yok).
 */
export function useKalanSure(dinlenme: Dinlenme | null): KalanSure {
  const [simdi, setSimdi] = useState(() => Date.now());
  // Yeni bir sayac basladiginda `simdi` bir onceki tikten kalma olabilir; baslangic anindan once
  // olamaz (bkz. Dinlenme yorumu).
  const etkinSimdi = dinlenme ? Math.max(simdi, dinlenme.bitisMs - dinlenme.toplamMs) : simdi;
  const bitti = dinlenme !== null && bittiMi(dinlenme, etkinSimdi);
  const calisiyor = dinlenme !== null && !bitti;

  useEffect(() => {
    if (!calisiyor) {
      return;
    }
    const zamanlayici = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(zamanlayici);
  }, [calisiyor]);

  if (!dinlenme) {
    return { metin: null, bitti: false, oran: 0 };
  }
  return {
    metin: bitti ? null : kalanSureMetni(kalanMs(dinlenme, etkinSimdi)),
    bitti,
    oran: gecenOran(dinlenme, etkinSimdi),
  };
}
