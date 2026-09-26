import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'nativewind';
import { useEtkinTema } from './renkler';

export type TemaTercihi = 'sistem' | 'acik' | 'koyu';
export type EtkinTema = 'acik' | 'koyu';

/** Web'in `grind.tema` anahtariyla AYNI ad (#271); iki istemci ayni kavrami ayni adla saklar. */
export const TEMA_ANAHTARI = 'grind.tema';

interface TemaContextTipi {
  tercih: TemaTercihi;
  setTercih: (tercih: TemaTercihi) => void;
  etkinTema: EtkinTema;
}

const TemaContext = createContext<TemaContextTipi | null>(null);

function tercihiCoz(saklanan: string | null): TemaTercihi {
  return saklanan === 'acik' || saklanan === 'koyu' ? saklanan : 'sistem';
}

function nativeWindDegeri(tercih: TemaTercihi): 'light' | 'dark' | 'system' {
  if (tercih === 'acik') return 'light';
  if (tercih === 'koyu') return 'dark';
  return 'system';
}

/**
 * Tema tercihi (#271). TEK yazma yolu NativeWind'in `setColorScheme`idir: Tailwind siniflari
 * (global.css degiskenleri) ve JS tarafindaki palet (`useRenkPaleti`) ayni `colorScheme`i okur,
 * boylece "CSS acik, JS koyu" ayrismasi tekrarlanamaz.
 *
 * Tercih cihazda kalir (SecureStore), sunucuya gitmez. Hic dokunulmadiysa "sistem"dir ve
 * isletim sistemini izler -- bunun calismasi icin `app.json`daki `userInterfaceStyle`
 * `automatic` olmali, aksi halde isletim sistemi uygulamaya hep ayni semayi bildirir.
 */
export function TemaProvider({ children }: { children: ReactNode }) {
  const [tercih, setTercihDurumu] = useState<TemaTercihi>('sistem');
  const { setColorScheme } = useColorScheme();
  const etkinTema = useEtkinTema();

  useEffect(() => {
    let iptal = false;
    SecureStore.getItemAsync(TEMA_ANAHTARI)
      .then((saklanan) => {
        if (iptal) return;
        const cozulen = tercihiCoz(saklanan);
        setTercihDurumu(cozulen);
        setColorScheme(nativeWindDegeri(cozulen));
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [setColorScheme]);

  const deger = useMemo<TemaContextTipi>(
    () => ({
      tercih,
      etkinTema,
      setTercih: (yeni) => {
        setTercihDurumu(yeni);
        setColorScheme(nativeWindDegeri(yeni));
        // "sistem" bir deger DEGIL, tercihin yoklugudur: anahtari silmek, ileride varsayilan
        // degisirse kullanicinin secimini yanlis yorumlamamayi da garanti eder.
        const yazma =
          yeni === 'sistem'
            ? SecureStore.deleteItemAsync(TEMA_ANAHTARI)
            : SecureStore.setItemAsync(TEMA_ANAHTARI, yeni);
        yazma.catch(() => {});
      },
    }),
    [tercih, etkinTema, setColorScheme],
  );

  return <TemaContext.Provider value={deger}>{children}</TemaContext.Provider>;
}

export function useTema(): TemaContextTipi {
  const context = useContext(TemaContext);
  if (!context) {
    throw new Error('useTema, TemaProvider içinde kullanılmalıdır.');
  }
  return context;
}
