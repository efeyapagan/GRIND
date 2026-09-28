import { useEffect, useState } from 'react';
import { gecenSureMetni } from './lib/format';

/**
 * Bir baslangic anindan (ISO) bu yana gecen sure, saniyede bir yenilenir; baslangic yokken `null`
 * (gosterge o zaman hic cizilmez). `useKalanSure` ile ayni desen: saf bicimlendirme
 * `lib/format.ts`te durur, bu kanca yalnizca zamani tikletir -- boylece sureyi gosteren her yer
 * AYNI kaynaktan beslenir.
 *
 * Gecen sure her tikte `Date.now()`dan hesaplanir (biriktirilen bir sayac degil): uygulama arka
 * plandan donunce ya da zamanlayici geciktiginde bile dogru kalir.
 */
export function useGecenSure(baslangicIso: string | null): string | null {
  const [simdi, setSimdi] = useState(() => Date.now());

  useEffect(() => {
    if (!baslangicIso) {
      return;
    }
    // Yeni bir baslangic geldiginde `simdi` onceki tikten kalma olabilir -- once tazelenir.
    setSimdi(Date.now());
    const zamanlayici = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(zamanlayici);
  }, [baslangicIso]);

  if (!baslangicIso) {
    return null;
  }
  return gecenSureMetni(simdi - new Date(baslangicIso).getTime());
}
