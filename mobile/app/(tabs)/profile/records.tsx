import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react-native';
import { useGuncelTakvimOzeti, usePlatolar, useRecords } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import BosDurum from '../../../src/ui/BosDurum';
import RekorKarti from '../../../src/components/RekorKarti';
import { useAltMenuPayi } from '../../../src/ui/KabukTabBar';

/**
 * web/src/pages/RecordsPage.tsx ile ayni: her egzersiz icin en agir set ve en cok tekrar AYRI.
 * #293: Profil'in kendi sekmelerinde ust basliktaki metin tamamen kalkti -- `usePageTitle('')`
 * onceki basligi temizler.
 */
export default function RecordsScreen() {
  const { t } = useTranslation();
  const altMenuPayi = useAltMenuPayi();
  usePageTitle('');
  const { data, isLoading, isError } = useRecords();
  const { data: takvimOzeti } = useGuncelTakvimOzeti();
  // #72: web ile ayni -- platodaki kartlara rozet; sorgu dusse de rekorlar gosterilir.
  const { data: platolar } = usePlatolar();
  const platoOf = new Map(platolar?.map((p) => [p.exerciseId, p]));

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      <Text className="text-body text-muted">{t('rekorlar.altBaslik')}</Text>

      {takvimOzeti && (
        <View className="rounded-xl bg-surface-2 p-4">
          <View className="flex-col gap-1">
            <Text className="text-label text-muted">{t('rekorlar.enUzunSeri')}</Text>
            <Text className="text-metric text-fg">{t('takvim.haftaSayisi', { count: takvimOzeti.longestWeekStreak })}</Text>
          </View>
        </View>
      )}

      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}

      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('rekorlar.hata')}
        </Text>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <BosDurum ikon={Trophy} baslik={t('rekorlar.bosBaslik')} />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <View className="flex-col gap-4">
          {data.map((rekor) => (
            <RekorKarti key={rekor.exerciseId} rekor={rekor} plato={platoOf.get(rekor.exerciseId)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
