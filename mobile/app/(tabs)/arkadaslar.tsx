import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@grind/shared/pageTitle';
import { useArkadasHaftasi } from '@grind/shared/api/queries';
import { arkadaslariSirala, liderKullaniciAdi } from '@grind/shared/lib/arkadasSiralamasi';
import ArkadasSatiri from '../../src/components/ArkadasSatiri';
import EkranKaydirici from '../../src/ui/EkranKaydirici';

/** "Tümünü gör" (#418): ana ekrandaki ilk 5'in tamamı, aynı satır bileşeni ve aynı sırayla. */
export default function ArkadaslarScreen() {
  const { t } = useTranslation();
  usePageTitle(t('arkadaslar.baslik'));
  const { data, isLoading, isError } = useArkadasHaftasi();
  const sirali = arkadaslariSirala(data ?? []);
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
        <ArkadasSatiri key={arkadas.username} arkadas={arkadas} lider={arkadas.username === lider} />
      ))}
      {/* #425: kendi satiri hep geldigi icin tek satir = arkadas yok demek. */}
      {sirali.length === 1 && (
        <Text className="text-label text-muted">{t('arkadaslar.arkadasYokIpucu')}</Text>
      )}
    </EkranKaydirici>
  );
}
