import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { useGunGecmisi } from '@grind/shared/api/queries';
import { gunBasligi } from '@grind/shared/lib/takvim';
import { usePageTitle } from '@grind/shared/pageTitle';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';
import GecmisKarti from '../../../src/components/GecmisKarti';

/**
 * web/src/pages/GunDetayPage.tsx ile ayni (#261, #315): takvimde bir gune dokununca acilir.
 * Takvimin altindaki tek satirlik ozet yerini bu ekrana birakti -- o gunun her antrenmani,
 * gecmisteki KARTIN AYNISIYLA (`GecmisKarti`) gosterilir: ozet ustte, sag kosedeki okla acilinca
 * hangi harekette kac set ve her setin agirlik/tekrar/RIR'i.
 *
 * Kart SALT-OKUNURDUR (`onSil` verilmez): takvimden gelen bir bakis ekraninda silme yolu acmak
 * yanlislikla veri kaybettirir -- silme Gecmis sekmesinde kalir.
 */
export default function GunDetayScreen() {
  const { t } = useTranslation();
  const dil = useDil();
  const { gun } = useLocalSearchParams<{ gun: string }>();
  const tarih = gun ?? '';
  usePageTitle(tarih ? gunBasligi(tarih, dil) : '');
  const { data: oturumlar, isLoading, isError } = useGunGecmisi(tarih || null);

  return (
    <EkranKaydirici contentContainerClassName="flex-grow gap-3 px-4 pt-2 pb-4">
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('takvim.gunAlinamadi')}
        </Text>
      )}
      {!isLoading && !isError && (oturumlar ?? []).length === 0 && (
        <Text className="text-body text-muted">{t('takvim.gunBosDurum')}</Text>
      )}
      {(oturumlar ?? []).map((oturum) => (
        <View key={oturum.sessionId}>
          <GecmisKarti oturum={oturum} />
        </View>
      ))}
    </EkranKaydirici>
  );
}
