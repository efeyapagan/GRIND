import { View, Text, ScrollView } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useGuncelTakvimOzeti, usePlatolar, useRecords, type Plato } from '@grind/shared/api/queries';
import { formatTarih, formatWeight } from '@grind/shared/lib/format';
import { usePageTitle } from '@grind/shared/pageTitle';
import BosDurum from '../../../src/ui/BosDurum';
import Rozet from '../../../src/ui/Rozet';

/** Kart basligi: hareket adi ve -- platodaysa (#72) -- rozet ile sunucunun verdigi sure/1RM. */
function PlatoBasligi({ ad, plato }: { ad: string; plato: Plato | undefined }) {
  const { t } = useTranslation();
  const dil = useDil();
  return (
    <View className="flex-col gap-1">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-2.5">
          <View className="size-2 rounded-full bg-accent" />
          <Text className="text-heading text-fg">{ad}</Text>
        </View>
        {plato && <Rozet ton="acik">{t('rekorlar.plato')}</Rozet>}
      </View>
      {plato && (
        <Text className="text-label-xs text-muted">
          {t('rekorlar.platoAciklama', { count: plato.weeks, kg: formatWeight(plato.bestOneRepMax, dil) })}
        </Text>
      )}
    </View>
  );
}

/** web/src/pages/RecordsPage.tsx ile ayni: her egzersiz icin en agir set ve en cok tekrar AYRI. */
export default function RecordsScreen() {
  const dil = useDil();
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
            <View
              key={rekor.exerciseId}
              testID={`rekor-karti-${rekor.exerciseId}`}
              className="flex-col gap-4 rounded-xl bg-surface-2 p-4"
            >
              <PlatoBasligi ad={rekor.exerciseName} plato={platoOf.get(rekor.exerciseId)} />
              <View className="flex-col gap-2">
                <View className="flex-col gap-1 rounded-lg bg-surface-1 p-3">
                  <View className="flex-row items-center gap-1.5">
                    <Rozet>En ağır set</Rozet>
                    <Text className="text-label-xs text-muted">· {formatTarih(rekor.bestWeightAt, dil)}</Text>
                  </View>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-metric text-fg">{formatWeight(rekor.bestWeight, dil)} kg</Text>
                    <Text className="text-body-lg font-bold text-accent-soft">
                      × {rekor.bestWeightReps}
                    </Text>
                  </View>
                </View>
                <View className="flex-col gap-1 rounded-lg bg-surface-1 p-3">
                  <View className="flex-row items-center gap-1.5">
                    <Rozet ton="acik">En çok tekrar</Rozet>
                    <Text className="text-label-xs text-muted">· {formatTarih(rekor.bestRepsAt, dil)}</Text>
                  </View>
                  <View className="flex-row items-baseline gap-1.5">
                    <Text className="text-metric text-fg">{rekor.bestReps} tekrar</Text>
                    <Text className="text-body text-muted">@ {formatWeight(rekor.bestRepsWeight, dil)} kg</Text>
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
