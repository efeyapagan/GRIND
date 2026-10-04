import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react-native';
import { useWeeklyStats } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import HataKutusu from '../../../src/ui/HataKutusu';
import BosDurum from '../../../src/ui/BosDurum';
import { useAltMenuPayi } from '../../../src/ui/KabukTabBar';
import HaftalikHacimKarti from '../../../src/components/HaftalikHacimKarti';
import KasGrubuKarti from '../../../src/components/KasGrubuKarti';
import CevrimdisiKapisi from '../../../src/baglanti/CevrimdisiKapisi';
import BirTekrarKarti from '../../../src/components/BirTekrarKarti';
import AsiriYuklenmeKarti from '../../../src/components/AsiriYuklenmeKarti';
import KaydirmaliKartlar from '../../../src/ui/KaydirmaliKartlar';

/**
 * #184: asamali yuklenme analizi -- haftalik hacim, kas grubuna gore setler, tahmini 1RM (#631: hacim ve 1RM
 * ayni yana kayan alanda). Veri tek istekte (`/stats/weekly`); hic seti olmayan kullaniciya kartlar yerine tek
 * bir bos durum.
 * #176: en ustte asiri yuklenme karti, yalnizca sinyal yanarken.
 */
/** #174: cevrimdisiyken bu bolum onbellekten gosterilmez -- icerik baglanmaz, uyari cizilir. */
export default function ProgressScreen() {
  const { t } = useTranslation();
  usePageTitle(t('kabuk.sekmeIlerleme'));
  return (
    <CevrimdisiKapisi>
      <ProgressIcerigi />
    </CevrimdisiKapisi>
  );
}

function ProgressIcerigi() {
  const { t } = useTranslation();
  const altMenuPayi = useAltMenuPayi();
  usePageTitle(t('kabuk.sekmeIlerleme'));
  const { data: haftalar, isLoading, isError } = useWeeklyStats();

  if (isLoading) {
    return <Text className="px-4 text-body text-muted">{t('ortak.yukleniyor')}</Text>;
  }
  if (isError || !haftalar) {
    return (
      <View className="px-4">
        <HataKutusu baslik={t('ilerleme.hataBaslik')} mesaj={t('ilerleme.hataMesaj')} />
      </View>
    );
  }
  if (haftalar.length === 0) {
    return <BosDurum ikon={TrendingUp} baslik={t('ilerleme.bos')} />;
  }

  return (
    // Rekorlar sekmesiyle ayni kaydirma kabi (`records.tsx`).
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      <AsiriYuklenmeKarti />
      {/* #631: hacim ve 1RM tek alanda, Instagram'daki coklu gonderi gibi yana kayar. */}
      <KaydirmaliKartlar>
        <HaftalikHacimKarti haftalar={haftalar} />
        <BirTekrarKarti />
      </KaydirmaliKartlar>
      <KasGrubuKarti haftalar={haftalar} />
    </ScrollView>
  );
}
