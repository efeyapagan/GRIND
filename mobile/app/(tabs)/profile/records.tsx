import { View, Text, ScrollView } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useGuncelTakvimOzeti, usePlatolar, useRecords } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import BosDurum from '../../../src/ui/BosDurum';
import RekorKarti from '../../../src/components/RekorKarti';

/** web/src/pages/RecordsPage.tsx ile ayni: her egzersiz icin en agir set ve en cok tekrar AYRI. */
export default function RecordsScreen() {
  usePageTitle('Rekorlar');
  const { data, isLoading, isError } = useRecords();
  const { data: takvimOzeti } = useGuncelTakvimOzeti();
  // #72: web ile ayni -- platodaki kartlara rozet; sorgu dusse de rekorlar gosterilir.
  const { data: platolar } = usePlatolar();
  const platoOf = new Map(platolar?.map((p) => [p.exerciseId, p]));

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2 pb-4">
      <Text className="text-body text-muted">Kişisel en iyiler</Text>

      {takvimOzeti && (
        <View className="rounded-xl bg-surface-2 p-4">
          <View className="flex-col gap-1">
            <Text className="text-label text-muted">En uzun seri</Text>
            <Text className="text-metric text-fg">{`${takvimOzeti.longestWeekStreak} hafta`}</Text>
          </View>
        </View>
      )}

      {isLoading && <Text className="text-body text-muted">Yükleniyor...</Text>}

      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          Rekorlar alınamadı. Lütfen sayfayı yenileyin.
        </Text>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <BosDurum ikon={Trophy} baslik="Henüz rekor yok" />
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
