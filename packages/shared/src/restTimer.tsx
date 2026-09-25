import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Dinlenme } from './lib/dinlenme';

interface RestTimerContextValue {
  dinlenme: Dinlenme | null;
  setDinlenme: (dinlenme: Dinlenme | null) => void;
  /** Sayac ust barin USTUNDE genis panel olarak mi duruyor, yoksa bara kuculmus mu (kullanici karari). */
  genis: boolean;
  setGenis: (genis: boolean) => void;
}

const RestTimerContext = createContext<RestTimerContextValue | undefined>(undefined);

/**
 * Dinlenme sayacinin durumu antrenman sayfasina degil ortak kabuga aittir (`PageTitleProvider` ile
 * ayni desen, bkz. pageTitle.tsx): sayac baslayinca ust bari KAPLAYAN genis bir panel acilir, panel
 * yukari itilip kucultulunce yerine ust barin ortasinda kalan sure kalir. Ikisi AYNI ANDA gorunmez --
 * hangisinin cizilecegine tek bir `genis` bayragi karar verir.
 *
 * Yeni bir sayac HER ZAMAN genis baslar: set girildikten sonraki ilk saniyelerde kullanicinin
 * gormek istedigi sey sureyi uzatma/atlama dugmeleridir, kucuk bir sayi degil.
 */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [dinlenme, setDinlenmeDurumu] = useState<Dinlenme | null>(null);
  const [genis, setGenis] = useState(true);

  const setDinlenme = useCallback((yeni: Dinlenme | null) => {
    setDinlenmeDurumu(yeni);
    setGenis(true);
  }, []);

  const deger = useMemo(
    () => ({ dinlenme, setDinlenme, genis, setGenis }),
    [dinlenme, setDinlenme, genis],
  );
  return <RestTimerContext.Provider value={deger}>{children}</RestTimerContext.Provider>;
}

function useRestTimerContext(): RestTimerContextValue {
  const context = useContext(RestTimerContext);
  if (!context) {
    throw new Error('useRestTimer, RestTimerProvider içinde kullanılmalıdır.');
  }
  return context;
}

/** Sayaci baslatan/temizleyen taraf (set paneli, geri yukleme): yalnizca degerin kendisi. */
export function useRestTimer() {
  const { dinlenme, setDinlenme } = useRestTimerContext();
  return [dinlenme, setDinlenme] as const;
}

/** Sayaci CIZEN taraf (ortak kabuk): deger + genislik. */
export function useRestTimerGorunumu(): RestTimerContextValue {
  return useRestTimerContext();
}
