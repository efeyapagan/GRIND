import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@grind/shared/pageTitle';
import { useOpenSession } from '@grind/shared/api/queries';
import DevamEdenAntrenman from '../../src/components/DevamEdenAntrenman';
import Takvim from '../../src/components/Takvim';
import ArkadasKarsilastirma from '../../src/components/ArkadasKarsilastirma';
import { useAltMenuPayi } from '../../src/ui/KabukTabBar';
import CevrimdisiKapisi from '../../src/baglanti/CevrimdisiKapisi';

/** web/src/pages/AnaSayfaPage.tsx ile ayni (issue #119/#120). */
export default function AnaSayfaScreen() {
  const { t } = useTranslation();
  const altMenuPayi = useAltMenuPayi();
  usePageTitle(t('kabuk.anaSayfa'));
  /**
   * #502 (kullanici karari): acik antrenman karti takvimin USTUNE dondu. #175'te de orada, #412'de
   * EN ALTA alinmisti -- acik oturum sorgusu takvimden ayri bir anda cozuldugu icin kart SONRADAN
   * belirip altindaki her seyi asagi itiyordu ("once takvim geliyor, sonra cakisiyor, sonra takvim
   * asagi iniyor"). Sorun sira degil ZAMANLAMA: kartin ALTINDAKI hicbir sey, kartin olup olmadigi
   * bilinmeden cizilmez. Sorgu onbellekteyse bu bekleme hic yasanmaz; yalnizca ilk acilista takvim
   * bir an gec gelir -- tek seferlik bir belirme, carpismali bir kayma degil.
   */
  const { isLoading: oturumYukleniyor } = useOpenSession();

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      <DevamEdenAntrenman />
      {!oturumYukleniyor && (
        <>
          <Takvim />
          {/* #174: arkadaslar onbellekten gosterilmez -- cevrimdisiyken uyari. */}
          <CevrimdisiKapisi className="">
            <ArkadasKarsilastirma />
          </CevrimdisiKapisi>
        </>
      )}
    </ScrollView>
  );
}
