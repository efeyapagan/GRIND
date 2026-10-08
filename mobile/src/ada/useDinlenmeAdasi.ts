import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { renklerKoyu } from '@grind/shared/designTokens';
import { duraklatildiMi, type Dinlenme } from '@grind/shared/lib/dinlenme';
import type { DinlenmeAdasiProps } from './DinlenmeAdasi';

/** Adaya dokununca acilan ekran. */
const ANTRENMAN_BAGLANTISI = 'grind://antrenman';

type Ada = typeof import('./DinlenmeAdasi').default;

/**
 * Ada yalnizca kendi iOS build'imizde vardir: `expo-widgets` Expo Go'da yuklu degil ve modulu orada yuklemek
 * hata verir. Bu yuzden modul SARTLI yuklenir; Expo Go, Android ve yuklenemedigi her durumda sayac adasiz calisir.
 */
function adayiYukle(): Ada | null {
  if (Platform.OS !== 'ios' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  try {
    return (require('./DinlenmeAdasi') as { default: Ada }).default;
  } catch {
    return null;
  }
}

/**
 * #414: dinlenme sayacini Dynamic Island'a yansitir. Sayac surerken ada acilir (sure degisince guncellenir),
 * sayac temizlenince ya da duraklatilinca kapanir. Sure DOLUNCA kapatilmaz: `staleDate` gectigi icin adada saat
 * ikonu kalir, sayac temizlendiginde (antrenmana donulunce / yeni sette) kapanir.
 */
export function useDinlenmeAdasi(dinlenme: Dinlenme | null, bitti: boolean) {
  const { t } = useTranslation();
  const etiket = t('antrenman.dinlenme');
  const bittiEtiketi = t('antrenman.dinlenmeBitti');

  useEffect(() => {
    const ada = adayiYukle();
    if (!ada) {
      return;
    }
    const aciklar = ada.getInstances();
    if (!dinlenme || duraklatildiMi(dinlenme)) {
      for (const acik of aciklar) {
        void acik.end('immediate');
      }
      return;
    }
    if (bitti) {
      return;
    }
    const props: DinlenmeAdasiProps = {
      baslangicMs: dinlenme.bitisMs - dinlenme.toplamMs,
      bitisMs: dinlenme.bitisMs,
      etiket,
      bittiEtiketi,
      vurgu: renklerKoyu.accent,
    };
    const bitis = new Date(dinlenme.bitisMs);
    if (aciklar.length > 0) {
      void aciklar[0].update(props, bitis);
    } else {
      ada.start(props, ANTRENMAN_BAGLANTISI, bitis);
    }
  }, [dinlenme, bitti, etiket, bittiEtiketi]);
}
