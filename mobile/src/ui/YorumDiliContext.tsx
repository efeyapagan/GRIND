import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { DILLER, type Dil } from '@grind/shared/i18n/dil';
import { useDilTercihi } from './DilContext';

export const YORUM_DILI_ANAHTARI = 'grind.aiDili';

interface YorumDiliContextTipi {
  yorumDili: Dil;
  yorumDiliniSec: (dil: Dil) => void;
  /**
   * Cihazdaki tercih okundu mu (#463). Tuketiciler bu `false` iken YORUM METNI cizmemeli:
   * ilk kare arayuz diliyle cizilip tercih gelince degisiyordu ve kullanici "once JSON gordum,
   * sonra duzeldi" diyordu. Titreme burada, tek yerde kapatilir.
   */
  hazir: boolean;
}

const YorumDiliContext = createContext<YorumDiliContextTipi | null>(null);

function tercihiCoz(saklanan: string | null): Dil | null {
  return DILLER.includes(saklanan as Dil) ? (saklanan as Dil) : null;
}

/**
 * AI yorumunun GOSTERIM dili (#199). Bir uretim desteklenen butun dilleri icerdigi icin bu tercih
 * yalnizca hangi cevirinin cizilecegini secer -- degistirmek YENI BIR ISTEK (ve yeni bir LLM
 * ucreti) DOGURMAZ.
 *
 * Arayuz dilinden AYRI tutulur (kullanici ayri bir secici istedi) ama varsayilani odur: kimse bir
 * sey secmeden once makul olan, uygulamayi hangi dilde kullaniyorsa o.
 *
 * Tercih cihazda saklanir (`DilContext`/`TemaContext` ile ayni desen), sunucuya gitmez.
 */
export function YorumDiliProvider({ children }: { children: ReactNode }) {
  const { dil: arayuzDili } = useDilTercihi();
  const [secilen, setSecilen] = useState<Dil | null>(null);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    let iptal = false;
    SecureStore.getItemAsync(YORUM_DILI_ANAHTARI)
      .then((saklanan) => {
        if (iptal) return;
        const cozulen = tercihiCoz(saklanan);
        if (cozulen !== null) setSecilen(cozulen);
      })
      // Cihaz okunamazsa (kilitli, silinmis) ekran yine acilir: arayuz diline dusulur.
      .catch(() => {})
      .finally(() => {
        if (!iptal) setHazir(true);
      });
    return () => {
      iptal = true;
    };
  }, []);

  const deger = useMemo<YorumDiliContextTipi>(
    () => ({
      hazir,
      yorumDili: secilen ?? arayuzDili,
      yorumDiliniSec: (dil) => {
        setSecilen(dil);
        void SecureStore.setItemAsync(YORUM_DILI_ANAHTARI, dil).catch(() => {});
      },
    }),
    [secilen, arayuzDili, hazir],
  );

  return <YorumDiliContext.Provider value={deger}>{children}</YorumDiliContext.Provider>;
}

export function useYorumDili(): YorumDiliContextTipi {
  const deger = useContext(YorumDiliContext);
  if (deger === null) {
    throw new Error('useYorumDili, YorumDiliProvider icinde kullanilmali.');
  }
  return deger;
}
