import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { takvimSorgusu } from '@grind/shared/api/queries';
import { trBugundenOnce } from '@grind/shared/lib/format';
import { onbelleklenecekTakvimAraliklari } from '@grind/shared/lib/takvim';
import { useAuth } from '../auth/AuthContext';
import { useCevrimdisi } from '../baglanti/BaglantiSaglayici';
import { useKuyruk } from '../kuyruk/KuyrukSaglayici';

/** Onden cekilen takvim verisi bu sure tazesayilir; her acilista ayni araliklar yeniden istenmesin. */
const TAZELIK_MS = 5 * 60 * 1000;

/**
 * #174 (kullanici karari): bu ayin ve bir onceki ayin gecmis haftalari cevrimdisi de gorunsun -- cevrimiciyken
 * bu araliklar (aylik ve haftalik gorunum) onceden cekilir, kalici onbellek onlari diske yazar. Kullanici o
 * donemlere hic bakmamis olsa da internetsiz salonda gezinebilir.
 */
export default function TakvimOnYuklemesi() {
  const queryClient = useQueryClient();
  const { username } = useAuth();
  const cevrimdisi = useCevrimdisi();
  // Kuyrukta bekleyen islem varken cekilmez: sunucudaki eski takvim, cevrimdisi antrenmanin isledigi
  // takvimin ustune yazilirdi. Kuyruk bosalinca takvim zaten tazelenir.
  const { bekleyenVar } = useKuyruk();

  useEffect(() => {
    if (!username || cevrimdisi || bekleyenVar) {
      return;
    }
    for (const { from, to } of onbelleklenecekTakvimAraliklari(trBugundenOnce(0))) {
      void queryClient.prefetchQuery({ ...takvimSorgusu(from, to), staleTime: TAZELIK_MS });
    }
  }, [queryClient, username, cevrimdisi, bekleyenVar]);

  return null;
}
