import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCevrimdisi } from './BaglantiSaglayici';

/**
 * #174: cevrimdisi izin verilmeyen bir eylemi (sifre degistir, sablon duzenle/sil/sirala/sabitle/paylas,
 * gecmiste set duzenle/sil) sarar -- cevrimdisiyken eylem calismaz, "Internete baglan" uyarisi cikar.
 */
export function useCevrimiciEylem() {
  const { t } = useTranslation();
  const cevrimdisi = useCevrimdisi();
  return useCallback(
    <A extends unknown[]>(eylem: (...arguman: A) => void) =>
      (...arguman: A) => {
        if (cevrimdisi) {
          Alert.alert(t('ortak.internetBaglan'), t('ortak.internetGerekiyor'));
          return;
        }
        eylem(...arguman);
      },
    [cevrimdisi, t],
  );
}
