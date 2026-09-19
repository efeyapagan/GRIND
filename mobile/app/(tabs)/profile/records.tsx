import { View, Text, ScrollView } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useGuncelTakvimOzeti, useRecords } from '@grind/shared/api/queries';
import { formatTrDate, formatWeight } from '@grind/shared/lib/format';
import { usePageTitle } from '@grind/shared/pageTitle';
import BosDurum from '../../../src/ui/BosDurum';
import Rozet from '../../../src/ui/Rozet';

/** web/src/pages/RecordsPage.tsx ile ayni: her egzersiz icin en agir set ve en cok tekrar AYRI. */
export default function RecordsScreen() {
  usePageTitle('Rekorlar');
  const { data, isLoading, isError } = useRecords();
  const { data: takvimOzeti } = useGuncelTakvimOzeti();

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
            <View key={rekor.exerciseId} className="flex-col gap-4 rounded-xl bg-surface-2 p-4">
              <View className="flex-row items-center gap-2.5">
                <View className="size-2 rounded-full bg-accent" />
                <Text className="text-heading text-fg">{rekor.exerciseName}</Text>
              </View>
              <View className="flex-col gap-2">
                <View className="flex-col gap-1 rounded-lg bg-surface-1 p-3">
                  <View className="flex-row items-center gap-1.5">
                    <Rozet>En ağır set</Rozet>
                    <Text className="text-label-xs text-muted">· {formatTrDate(rekor.bestWeightAt)}</Text>
                  </View>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-metric text-fg">{formatWeight(rekor.bestWeight)} kg</Text>
                    <Text className="text-body-lg font-bold text-accent-soft">
                      × {rekor.bestWeightReps}
                    </Text>
                  </View>
                </View>
                <View className="flex-col gap-1 rounded-lg bg-surface-1 p-3">
                  <View className="flex-row items-center gap-1.5">
                    <Rozet ton="acik">En çok tekrar</Rozet>
                    <Text className="text-label-xs text-muted">· {formatTrDate(rekor.bestRepsAt)}</Text>
                  </View>
                  <View className="flex-row items-baseline gap-1.5">
                    <Text className="text-metric text-fg">{rekor.bestReps} tekrar</Text>
                    <Text className="text-body text-muted">@ {formatWeight(rekor.bestRepsWeight)} kg</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
