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
import BirTekrarKarti from '../../../src/components/BirTekrarKarti';

/**
 * #184: asamali yuklenme analizi -- haftalik hacim, kas grubuna gore setler, tahmini 1RM. Veri tek istekte
 * (`/stats/weekly`); hic seti olmayan kullaniciya kartlar yerine tek bir bos durum.
 */
export default function ProgressScreen() {
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
      <HaftalikHacimKarti haftalar={haftalar} />
      <KasGrubuKarti haftalar={haftalar} />
      <BirTekrarKarti />
    </ScrollView>
  );
}
