import { useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useOpenSession } from '@grind/shared/api/queries';
import {
  DINLENME_DEPO_ANAHTARI,
  dinlenmeKaydiAyristir,
  dinlenmeKaydiUret,
  type Dinlenme,
} from '@grind/shared/lib/dinlenme';

/**
 * Dinlenme sayaci durumu (#274 ile set panelinden ayrildi: panel kartin icinde, sayac listenin
 * sonunda -- ikisi de ekrandan bu tek durumu kullanir).
 *
 * Issue #190: sayfa degisip geri donulunce (bilesen unmount/remount olunca -- sekme degisimi,
 * uygulama arka plana atilip geri gelmesi) sayac kaybolmasin. `bitisMs` mutlak zaman damgasi
 * oldugu icin kalici depodan (expo-secure-store) okunan kayit dogru kalan sureyi kendiliginden verir.
 * web/AddSetForm.tsx ile ayni mantik; tek fark expo-secure-store ASENKRON (localStorage senkron).
 */
export function useDinlenme(egzersizId: number | null) {
  const { data: acikOturum, isLoading: oturumYukleniyor } = useOpenSession();
  const [dinlenme, setDinlenme] = useState<Dinlenme | null>(null);

  // Bu oturum icin GERI YUKLEME yalnizca BIR KEZ denenir -- aksi halde "Atla" ile temizlenen bir
  // sayac depodan geri gelebilir.
  const denenenOturum = useRef<number | null>(null);
  useEffect(() => {
    if (oturumYukleniyor || !acikOturum || egzersizId === null) {
      return;
    }
    if (denenenOturum.current === acikOturum.id) {
      return;
    }
    denenenOturum.current = acikOturum.id;
    let iptal = false;
    void SecureStore.getItemAsync(DINLENME_DEPO_ANAHTARI).then((ham) => {
      if (iptal) {
        return;
      }
      const geri = dinlenmeKaydiAyristir(ham, acikOturum.id, egzersizId, Date.now());
      if (geri) {
        setDinlenme(geri);
      }
    });
    return () => {
      iptal = true;
    };
  }, [oturumYukleniyor, acikOturum, egzersizId]);

  // Sayac degistikce (baslayinca, +15sn'de, Atla/bitince) kalici depo guncellenir. Acik oturum
  // yoksa (antrenman bitti/iptal edildi) kayit da silinir (issue #190 -- "kayit temizlensin").
  useEffect(() => {
    if (oturumYukleniyor) {
      return;
    }
    if (!acikOturum || egzersizId === null || !dinlenme) {
      void SecureStore.deleteItemAsync(DINLENME_DEPO_ANAHTARI);
      return;
    }
    void SecureStore.setItemAsync(DINLENME_DEPO_ANAHTARI, dinlenmeKaydiUret(acikOturum.id, egzersizId, dinlenme));
  }, [oturumYukleniyor, acikOturum, egzersizId, dinlenme]);

  return [dinlenme, setDinlenme] as const;
}
