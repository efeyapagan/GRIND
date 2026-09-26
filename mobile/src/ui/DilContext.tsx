import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { dilAlgila, i18n, type Dil } from '@grind/shared/i18n';

/** Web'in `grind.dil` anahtariyla AYNI ad (web/src/lib/dil.ts); iki istemci ayni kavrami ayni adla saklar. */
export const DIL_ANAHTARI = 'grind.dil';

interface DilContextTipi {
  dil: Dil;
  /** Kullanici bir dil sectiyse `false` degil `true`; hic secmediyse cihaz dili izlenir. */
  secildiMi: boolean;
  setDil: (dil: Dil) => void;
}

const DilContext = createContext<DilContextTipi | null>(null);

function tercihiCoz(saklanan: string | null): Dil | null {
  return saklanan === 'tr' || saklanan === 'en' ? saklanan : null;
}

/**
 * Cihazin dil listesi; `['en-US', 'tr']` gibi. Yerel modul okunamazsa (bazi test ve gelistirme
 * ortamlarinda oluyor) BOS liste doner: `dilAlgila` o zaman uygulamanin ana dili Turkce'ye duser,
 * ekran cokmez.
 */
function cihazDilleri(): string[] {
  try {
    return getLocales().map((yerel) => yerel.languageTag);
  } catch {
    return [];
  }
}

/**
 * Arayuz dili (#263 dilim 1: tr + en). Tercih CIHAZDA saklanir (SecureStore), sunucuya gitmez --
 * tema tercihiyle (TemaContext) ayni gerekce ve ayni desen. Tercih yoksa CIHAZ dili kullanilir:
 * `dilAlgila` desteklenen ilk dili secer, hicbiri yoksa Ingilizce'ye duser (uluslararasi
 * kullanici icin makul varsayilan -- bkz. packages/shared/src/i18n/dil.ts).
 *
 * Baslangic dili SENKRON belirlenir (`_layout.tsx` -> `baslangicDili()`): saklanan tercih
 * asenkron okundugu icin ilk kare cihaz diliyle cizilir, tercih gelince tek seferde degisir.
 * Yanlis dille bir kare parlamamasi icin uygulama zaten `hazir` olana kadar bosluk gosteriyor.
 */
export function DilProvider({ children }: { children: ReactNode }) {
  const [dil, setDilDurumu] = useState<Dil>(() => dilAlgila(cihazDilleri()));
  const [secildiMi, setSecildiMi] = useState(false);

  useEffect(() => {
    let iptal = false;
    SecureStore.getItemAsync(DIL_ANAHTARI)
      .then((saklanan) => {
        const cozulen = tercihiCoz(saklanan);
        if (iptal || cozulen === null) return;
        setDilDurumu(cozulen);
        setSecildiMi(true);
        void i18n.changeLanguage(cozulen);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, []);

  const deger = useMemo<DilContextTipi>(
    () => ({
      dil,
      secildiMi,
      setDil: (yeni) => {
        setDilDurumu(yeni);
        setSecildiMi(true);
        void i18n.changeLanguage(yeni);
        SecureStore.setItemAsync(DIL_ANAHTARI, yeni).catch(() => {});
      },
    }),
    [dil, secildiMi],
  );

  return <DilContext.Provider value={deger}>{children}</DilContext.Provider>;
}

export function useDilTercihi(): DilContextTipi {
  const context = useContext(DilContext);
  if (!context) {
    throw new Error('useDilTercihi, DilProvider icinde kullanilmalidir.');
  }
  return context;
}

/** i18next'i baslatirken kullanilacak ilk dil: cihaz dili (tercih asenkron gelir). */
export function baslangicDili(): Dil {
  return dilAlgila(cihazDilleri());
}
