import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { request, setBaglantiDinleyicisi } from '@grind/shared/api/client';
import { BASLANGIC_DURUMU, cevrimdisiMi, olay, type BaglantiDurumu, type BaglantiOlayi } from './baglantiDurumu';

/** Hata surerken sunucunun saglik ucu bu aralikla yoklanir (istek atan ekran olmasa da durum guncellensin). */
const YOKLAMA_MS = 3_000;
/** Durum her saniye yeniden degerlendirilir: 5 sn / 3 sn sinirlari zamanla gecilir, olayla degil. */
const DEGERLENDIRME_MS = 1_000;

export const BaglantiBaglami = createContext(false);

/** #174: sunucuya 5 sn ulasilamadiysa `true` (bkz. `baglantiDurumu`). */
export function useCevrimdisi(): boolean {
  return useContext(BaglantiBaglami);
}

/**
 * #174: `request()`in her istek sonucunu dinler, uygulama on plana donunce 3 sn tolerans tanir, hata
 * surerken saglik ucunu yoklar. Sonuc hem `useCevrimdisi()` ile ekranlara hem TanStack'in
 * `onlineManager`ina verilir: cevrimdisiyken sorgular aga cikmaz, onbellekteki veri kalir; donunce aktif
 * sorgular tazelenir.
 */
export default function BaglantiSaglayici({ children }: { children: React.ReactNode }) {
  const durum = useRef<BaglantiDurumu>(BASLANGIC_DURUMU);
  const [cevrimdisi, setCevrimdisi] = useState(false);

  useEffect(() => {
    function isle(yeni: BaglantiOlayi) {
      durum.current = olay(durum.current, yeni);
      setCevrimdisi(cevrimdisiMi(durum.current, Date.now()));
    }
    setBaglantiDinleyicisi((sonuc) => isle({ tur: sonuc, an: Date.now() }));

    const degerlendir = setInterval(() => setCevrimdisi(cevrimdisiMi(durum.current, Date.now())), DEGERLENDIRME_MS);
    const yokla = setInterval(() => {
      if (durum.current.ilkHata !== null) {
        // Sonuc `request()` uzerinden dinleyiciye zaten gelir; hata burada yutulur.
        request('/health', { auth: false }).catch(() => undefined);
      }
    }, YOKLAMA_MS);
    const uygulamaDurumu = AppState.addEventListener('change', (yeniDurum) => {
      if (yeniDurum === 'active') {
        isle({ tur: 'onPlanaDondu', an: Date.now() });
        request('/health', { auth: false }).catch(() => undefined);
      }
    });

    return () => {
      setBaglantiDinleyicisi(() => {});
      clearInterval(degerlendir);
      clearInterval(yokla);
      uygulamaDurumu.remove();
    };
  }, []);

  useEffect(() => {
    onlineManager.setOnline(!cevrimdisi);
  }, [cevrimdisi]);

  return <BaglantiBaglami.Provider value={cevrimdisi}>{children}</BaglantiBaglami.Provider>;
}
