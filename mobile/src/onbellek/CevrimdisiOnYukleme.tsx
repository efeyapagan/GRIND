import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { egzersizlerSorgusu, sablonlarSorgusu, takvimSorgusu } from '@grind/shared/api/queries';
import { trBugundenOnce } from '@grind/shared/lib/format';
import { onbelleklenecekTakvimAraliklari } from '@grind/shared/lib/takvim';
import { useAuth } from '../auth/AuthContext';
import { useCevrimdisi } from '../baglanti/BaglantiSaglayici';
import { useKuyruk } from '../kuyruk/KuyrukSaglayici';

/** Onden cekilen veri bu sure taze sayilir; her acilista ayni istekler yeniden atilmasin. */
const TAZELIK_MS = 5 * 60 * 1000;

/**
 * #174: cevrimdisi kullanimin ihtiyac duydugu veri cevrimiciyken onden cekilir, kalici onbellek onu diske yazar --
 * kullanici ilgili ekrani hic acmamis olsa da internetsiz salonda calisir:
 * - (kullanici karari) bu ayin ve bir onceki ayin takvim araliklari (aylik ve haftalik gorunum);
 * - (dilim 3) sablonlar ve hareket listesi: cevrimdisi sablonla baslatma, sablon olusturma/duzenleme ve
 *   antrenmana hareket ekleme bunlarsiz yapilamaz.
 */
export default function CevrimdisiOnYukleme() {
  const queryClient = useQueryClient();
  const { username } = useAuth();
  const cevrimdisi = useCevrimdisi();
  // Kuyrukta bekleyen islem varken cekilmez: sunucudaki eski takvim/sablonlar, cevrimdisi yapilanlarin
  // ustune yazilirdi. Kuyruk bosalinca takvim zaten tazelenir.
  const { bekleyenVar } = useKuyruk();

  useEffect(() => {
    if (!username || cevrimdisi || bekleyenVar) {
      return;
    }
    for (const { from, to } of onbelleklenecekTakvimAraliklari(trBugundenOnce(0))) {
      void queryClient.prefetchQuery({ ...takvimSorgusu(from, to), staleTime: TAZELIK_MS });
    }
    void queryClient.prefetchQuery({ ...sablonlarSorgusu(), staleTime: TAZELIK_MS });
    void queryClient.prefetchQuery({ ...egzersizlerSorgusu(), staleTime: TAZELIK_MS });
  }, [queryClient, username, cevrimdisi, bekleyenVar]);

  return null;
}
