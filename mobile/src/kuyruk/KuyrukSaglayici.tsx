import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@grind/shared/api/queries';
import { useAuth } from '../auth/AuthContext';
import { useCevrimdisi } from '../baglanti/BaglantiSaglayici';
import { kuyruguGonder } from './gonderici';
import { kimlikEsle, kuyrugaEkle, type BekleyenIslem } from './kuyruk';

/** Kuyruk doluyken baglanti varsa bu aralikla yeniden gonderim denenir (ag/5xx hatasindan sonra). */
const YENIDEN_DENEME_MS = 10_000;

/**
 * Kuyruk bosalana kadar sunucudan HIC cekilmeyen sorgular (`enabled: false` -- baska bir yerin invalidate'i
 * de cekemez): sunucudaki eski hal, gonderilmemis islemlerin iyimser halinin ustune yazilmasin.
 */
function dondurulanSorgular() {
  return [queryKeys.openSession, ['sessionSets'], queryKeys.historyAll];
}

export function kuyrukAnahtari(kullaniciAdi: string): string {
  return `grind.kuyruk.${kullaniciAdi.toLowerCase()}`;
}

interface KuyrukBaglami {
  /** Islemi kuyruga ekler (gecici kimlikler daha once eslendiyse gercekleriyle). */
  ekle: (islem: BekleyenIslem) => void;
  /** Gonderilmeyi bekleyen islem var mi -- varsa yeni yazmalar da sirayi korumak icin kuyruga girer. */
  bekleyenVar: boolean;
}

const Baglam = createContext<KuyrukBaglami>({ ekle: () => {}, bekleyenVar: false });

export function useKuyruk(): KuyrukBaglami {
  return useContext(Baglam);
}

function sorgulariDondur(queryClient: QueryClient, dondur: boolean) {
  for (const anahtar of dondurulanSorgular()) {
    queryClient.setQueryDefaults(
      anahtar,
      dondur
        ? { enabled: false, staleTime: Infinity, refetchOnMount: false, refetchOnReconnect: false, refetchOnWindowFocus: false }
        : { enabled: true, staleTime: 0, refetchOnMount: true, refetchOnReconnect: true, refetchOnWindowFocus: true },
    );
  }
}

/** Kuyruk bosalinca antrenmanin dokundugu her sey sunucudan tazelenir (PR'lar, gecmis, takvim, ilerleme). */
function hepsiniTazele(queryClient: QueryClient) {
  for (const anahtar of [
    queryKeys.openSession,
    ['sessionSets'],
    queryKeys.historyAll,
    queryKeys.records,
    queryKeys.calendarAll,
    queryKeys.exerciseProgressRoot,
    queryKeys.weeklyStats,
    queryKeys.volumeByExerciseAll,
    queryKeys.templates,
  ]) {
    void queryClient.invalidateQueries({ queryKey: anahtar });
  }
}

/**
 * #174 dilim 2: cevrimdisi yapilan antrenman islemlerinin kuyrugu. Kullaniciya bagli olarak diske yazilir
 * (uygulama kapansa da kaybolmaz); baglanti varken islemleri TEK TEK, sirayla gonderir -- gonderim
 * surerken eklenen islemler de sirayi bozmaz. Gecici kimliklerin gercek karsiliklari saklanir: ekranin hala
 * gecici kimlikle andigi kayitlara yeni islemler gercek kimlikle gider.
 */
export default function KuyrukSaglayici({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { username } = useAuth();
  const cevrimdisi = useCevrimdisi();
  const [kuyruk, setKuyrukDurumu] = useState<BekleyenIslem[]>([]);
  const kuyrukRef = useRef<BekleyenIslem[]>([]);
  const eslemeRef = useRef<Map<string, number>>(new Map());
  const gonderilen = useRef<string | undefined>(undefined);
  const calisiyor = useRef(false);
  const yuklendi = useRef(false);

  const yaz = useCallback(
    (yeni: BekleyenIslem[]) => {
      kuyrukRef.current = yeni;
      setKuyrukDurumu(yeni);
      if (username) {
        void AsyncStorage.setItem(kuyrukAnahtari(username), JSON.stringify(yeni));
      }
    },
    [username],
  );

  // Kullanici degisince onun kuyrugu diskten okunur.
  useEffect(() => {
    yuklendi.current = false;
    kuyrukRef.current = [];
    eslemeRef.current = new Map();
    setKuyrukDurumu([]);
    if (!username) {
      return;
    }
    let iptal = false;
    void AsyncStorage.getItem(kuyrukAnahtari(username)).then((metin) => {
      if (iptal) {
        return;
      }
      const okunan = metin ? (JSON.parse(metin) as BekleyenIslem[]) : [];
      if (okunan.length > 0) {
        sorgulariDondur(queryClient, true);
      }
      kuyrukRef.current = okunan;
      setKuyrukDurumu(okunan);
      yuklendi.current = true;
    });
    return () => {
      iptal = true;
    };
  }, [username, queryClient]);

  const gonder = useCallback(async () => {
    if (calisiyor.current || cevrimdisi || !yuklendi.current) {
      return;
    }
    calisiyor.current = true;
    try {
      while (kuyrukRef.current.length > 0) {
        const [ilk] = kuyrukRef.current;
        const sonuc = await kuyruguGonder([ilk], (anahtar) => {
          gonderilen.current = anahtar;
        });
        if (sonuc.durdu) {
          return;
        }
        let kalan = kuyrukRef.current.filter((islem) => islem.anahtar !== ilk.anahtar);
        for (const esleme of sonuc.eslemeler) {
          eslemeRef.current.set(`${esleme.tur}:${esleme.gecici}`, esleme.gercek);
          kalan = kimlikEsle(kalan, esleme.tur, esleme.gecici, esleme.gercek);
        }
        yaz(kalan);
      }
      eslemeRef.current = new Map();
      sorgulariDondur(queryClient, false);
      hepsiniTazele(queryClient);
    } finally {
      calisiyor.current = false;
    }
  }, [cevrimdisi, queryClient, yaz]);

  const ekle = useCallback(
    (islem: BekleyenIslem) => {
      // Ekran kaydi hala gecici kimlikle aniyor olabilir; gercek karsiligi biliniyorsa onunla gider.
      let eslenmis = islem;
      if ('oturumId' in eslenmis) {
        const gercek = eslemeRef.current.get(`oturum:${eslenmis.oturumId}`);
        if (gercek !== undefined) eslenmis = { ...eslenmis, oturumId: gercek };
      }
      if ('setId' in eslenmis) {
        const gercek = eslemeRef.current.get(`set:${eslenmis.setId}`);
        if (gercek !== undefined) eslenmis = { ...eslenmis, setId: gercek };
      }
      sorgulariDondur(queryClient, true);
      yaz(kuyrugaEkle(kuyrukRef.current, eslenmis, gonderilen.current));
    },
    [queryClient, yaz],
  );

  // Kuyruk degisince, baglanti gelince ve (bekleyen varken) duzenli araliklarla gonderim denenir.
  useEffect(() => {
    if (kuyruk.length === 0 || cevrimdisi) {
      return;
    }
    void gonder();
    const zamanlayici = setInterval(() => void gonder(), YENIDEN_DENEME_MS);
    return () => clearInterval(zamanlayici);
  }, [kuyruk.length, cevrimdisi, gonder]);

  const deger = useMemo(() => ({ ekle, bekleyenVar: kuyruk.length > 0 }), [ekle, kuyruk.length]);
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}
