import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@grind/shared/pageTitle';
import { useArkadasDonemi } from '@grind/shared/api/queries';
import { arkadaslariSirala, liderKullaniciAdi } from '@grind/shared/lib/arkadasSiralamasi';
import { gorunumAraligi } from '@grind/shared/lib/takvim';
import ArkadasSatiri from '../../src/components/ArkadasSatiri';
import EkranKaydirici from '../../src/ui/EkranKaydirici';
import { useArkadaslarDonemi, useArkadaslarDoneminiKapanistaBirak } from '../../src/ui/TakvimDonemiContext';

/**
 * "Tum arkadaslari gor" (#418, #420): ana ekrandaki 7 sinirinin tersine HERKES, ayni satir bileseni
 * ve ayni sirayla.
 *
 * #420: donemi kendine aittir (kullanici karari) -- sag ustteki takvim tusuyla (`DonemSecici`,
 * `KabukBaslik`) secilir ve ana sayfa takvimini TASIMAZ. Ekran her acilista ana sayfanin o anki
 * donemiyle baslar; kapaninca kendi secimini birakir.
 */
export default function ArkadaslarScreen() {
  const { t } = useTranslation();
  usePageTitle(t('arkadaslar.baslik'));
  useArkadaslarDoneminiKapanistaBirak();
  const { gorunum, gosterilen } = useArkadaslarDonemi();
  const { from, to } = gorunumAraligi(gorunum, gosterilen);
  const { data, isLoading, isError } = useArkadasDonemi(from, to);
  const sirali = arkadaslariSirala(data ?? [], gorunum);
  const lider = liderKullaniciAdi(sirali);

  return (
    <EkranKaydirici contentContainerClassName="gap-3 px-4 pt-2 pb-4">
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('arkadaslar.alinamadi')}
        </Text>
      )}
      {!isLoading && !isError && sirali.length === 0 && (
        <View className="flex-col gap-1">
          <Text className="text-body text-fg">{t('arkadaslar.bosBaslik')}</Text>
          <Text className="text-label text-muted">{t('arkadaslar.bosAciklama')}</Text>
        </View>
      )}
      {sirali.map((arkadas) => (
        <ArkadasSatiri key={arkadas.username} arkadas={arkadas} gorunum={gorunum} lider={arkadas.username === lider} />
      ))}
      {/* #425: kendi satiri hep geldigi icin tek satir = arkadas yok demek. */}
      {sirali.length === 1 && (
        <Text className="text-label text-muted">{t('arkadaslar.arkadasYokIpucu')}</Text>
      )}
    </EkranKaydirici>
  );
}
