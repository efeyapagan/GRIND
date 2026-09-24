import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import type { EgzersizRekoru, Plato } from '@grind/shared/api/queries';
import { formatTarih, formatWeight } from '@grind/shared/lib/format';
import Rozet from '../ui/Rozet';

/**
 * web/src/components/RekorKarti.tsx ile ayni: en agir set ve en cok tekrar AYRI; degerler sunucunun.
 * Kendi Rekorlar sekmen ve arkadasin rekorlari (#284) ortak; plato (#72) yalnizca kendi rekorlarinda.
 */
export default function RekorKarti({ rekor, plato }: { rekor: EgzersizRekoru; plato?: Plato }) {
  const { t } = useTranslation();
  const dil = useDil();

  return (
    <View testID={`rekor-karti-${rekor.exerciseId}`} className="flex-col gap-4 rounded-xl bg-surface-2 p-4">
      <View className="flex-col gap-1">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row items-center gap-2.5">
            <View className="size-2 rounded-full bg-accent" />
            <Text className="text-heading text-fg">{rekor.exerciseName}</Text>
          </View>
          {plato && <Rozet ton="acik">{t('rekorlar.plato')}</Rozet>}
        </View>
        {plato && (
          <Text className="text-label-xs text-muted">
            {t('rekorlar.platoAciklama', { count: plato.weeks, kg: formatWeight(plato.bestOneRepMax, dil) })}
          </Text>
        )}
      </View>
      <View className="flex-col gap-2">
        <View className="flex-col gap-1 rounded-lg bg-surface-1 p-3">
          <View className="flex-row items-center gap-1.5">
            <Rozet>{t('rekorlar.enAgirSet')}</Rozet>
            <Text className="text-label-xs text-muted">· {formatTarih(rekor.bestWeightAt, dil)}</Text>
          </View>
          <View className="flex-row items-baseline gap-1">
            <Text className="text-metric text-fg">{formatWeight(rekor.bestWeight, dil)} kg</Text>
            <Text className="text-body-lg font-bold text-accent-soft">× {rekor.bestWeightReps}</Text>
          </View>
        </View>
        <View className="flex-col gap-1 rounded-lg bg-surface-1 p-3">
          <View className="flex-row items-center gap-1.5">
            <Rozet ton="acik">{t('rekorlar.enCokTekrar')}</Rozet>
            <Text className="text-label-xs text-muted">· {formatTarih(rekor.bestRepsAt, dil)}</Text>
          </View>
          <View className="flex-row items-baseline gap-1.5">
            <Text className="text-metric text-fg">{t('rekorlar.tekrarSayisi', { count: rekor.bestReps })}</Text>
            <Text className="text-body text-muted">@ {formatWeight(rekor.bestRepsWeight, dil)} kg</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
