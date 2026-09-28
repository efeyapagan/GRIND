import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { trBugundenOnce } from '@grind/shared/lib/format';
import type { TakvimGorunumu } from '@grind/shared/lib/takvim';

interface Donem {
  gorunum: TakvimGorunumu;
  /** Donemin icindeki herhangi bir gun; aralik `gorunumAraligi(gorunum, gosterilen)` ile turer. */
  gosterilen: string;
}

export interface DonemApi extends Donem {
  bugun: string;
  sec: (gorunum: TakvimGorunumu, gosterilen: string) => void;
}

interface Deger {
  bugun: string;
  anaSayfa: Donem;
  setAnaSayfa: (donem: Donem) => void;
  /** `null` = ekran kendi donemini secmedi, ana sayfanin donemini izler. */
  arkadaslarSecimi: Donem | null;
  setArkadaslarSecimi: (donem: Donem | null) => void;
}

const TakvimDonemiContext = createContext<Deger | null>(null);

/**
 * Takvimin donemi (#420). Iki tuketicisi var ve ikisi de AYNI donemi okumak zorunda: ana sayfadaki
 * takvim ve hemen altindaki arkadas karsilastirmasi ("takvim neyi gosteriyorsa arkadaslar o
 * donemde siralansin"). Donem once `Takvim`in yerel durumuydu; iki ayri durum takvim ile listeyi
 * birbirinden ayristirirdi.
 *
 * Tum arkadaslar ekraninin donemi AYRIDIR (kullanici karari): orada secilen donem ana sayfa
 * takvimini TASIMAZ. Ekran her acilista ana sayfanin o anki donemiyle baslar; kendi secimi yalnizca
 * ekran acikken yasar. Secicisi ust barda durdugu (`KabukBaslik`) ve ekranla ayni agacta olmadigi
 * icin bu durum da burada tutulur.
 *
 * Hicbiri kalici saklanmaz: uygulama her acilista bu haftayla baslar (#315).
 */
export function TakvimDonemiProvider({
  bugun = trBugundenOnce(0),
  baslangic,
  children,
}: {
  bugun?: string;
  /** Ana sayfanin baslangic donemi; verilmezse bu hafta. */
  baslangic?: Donem;
  children: ReactNode;
}) {
  const [anaSayfa, setAnaSayfa] = useState<Donem>(baslangic ?? { gorunum: 'hafta', gosterilen: bugun });
  const [arkadaslarSecimi, setArkadaslarSecimi] = useState<Donem | null>(null);

  const deger = useMemo(
    () => ({ bugun, anaSayfa, setAnaSayfa, arkadaslarSecimi, setArkadaslarSecimi }),
    [bugun, anaSayfa, arkadaslarSecimi],
  );

  return <TakvimDonemiContext.Provider value={deger}>{children}</TakvimDonemiContext.Provider>;
}

function useDeger(): Deger {
  const deger = useContext(TakvimDonemiContext);
  if (!deger) {
    throw new Error('useTakvimDonemi/useArkadaslarDonemi, TakvimDonemiProvider içinde kullanılmalıdır.'); // i18n-muaf: gelistirici hatasi, kullaniciya gorunmez
  }
  return deger;
}

/** Ana sayfanin donemi: takvim ve ana sayfadaki arkadas karsilastirmasi. */
export function useTakvimDonemi(): DonemApi {
  const { bugun, anaSayfa, setAnaSayfa } = useDeger();
  return {
    bugun,
    ...anaSayfa,
    sec: (gorunum, gosterilen) => setAnaSayfa({ gorunum, gosterilen }),
  };
}

/**
 * Tum arkadaslar ekraninin donemi: kendi secimi yoksa ana sayfaninki. `sec` ana sayfayi
 * DEGISTIRMEZ.
 */
export function useArkadaslarDonemi(): DonemApi {
  const { bugun, anaSayfa, arkadaslarSecimi, setArkadaslarSecimi } = useDeger();
  return {
    bugun,
    ...(arkadaslarSecimi ?? anaSayfa),
    sec: (gorunum, gosterilen) => setArkadaslarSecimi({ gorunum, gosterilen }),
  };
}

/**
 * Ekran kapaninca kendi secimini birakir: bir sonraki acilis ana sayfanin donemiyle baslar.
 * Temizlik ACILISTA degil KAPANISTA yapilir -- acilista yapilsaydi ilk cizim eski secimin
 * araligini bir kez isterdi.
 */
export function useArkadaslarDoneminiKapanistaBirak() {
  const { setArkadaslarSecimi } = useDeger();
  useEffect(() => () => setArkadaslarSecimi(null), [setArkadaslarSecimi]);
}
