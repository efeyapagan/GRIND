import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { useOverreaching } from '@grind/shared/api/queries';
import { formatWeight } from '@grind/shared/lib/format';
import CamKart from '../ui/CamKart';
import Rozet from '../ui/Rozet';

/**
 * #176: asiri yuklenme (overreaching) sinyali -- yalnizca yanarken, Ilerleme sekmesinin en ustunde. Kural
 * sunucuda (`OverreachingDetector`); istemci yeniden hesaplamaz. Kapatilamaz: sinyal veriye bagli, deload
 * yapilip performans toparlaninca kendiliginden kaybolur.
 */
export default function AsiriYuklenmeKarti() {
  const { t } = useTranslation();
  const dil = useDil();
  const { data: sinyal } = useOverreaching();

  if (!sinyal) {
    return null;
  }

  return (
    <CamKart className="flex-col gap-3 p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-heading text-fg">{t('asiriYuklenme.baslik')}</Text>
        <Rozet ton="acik">{t('asiriYuklenme.rozet')}</Rozet>
      </View>
      <View className="flex-col gap-1">
        {sinyal.drops.map((dusus) => (
          <Text key={dusus.exerciseId} className="text-body text-fg">
            {t('asiriYuklenme.dususSatiri', {
              hareket: dusus.exerciseName,
              onceki: formatWeight(dusus.previousBest, dil),
              son: formatWeight(dusus.recentBest, dil),
              yuzde: formatWeight(dusus.dropPercent, dil),
            })}
          </Text>
        ))}
      </View>
      {sinyal.rirBefore !== null && sinyal.rirRecent !== null && (
        <Text className="text-body text-muted">
          {t('asiriYuklenme.rirSatiri', {
            onceki: formatWeight(sinyal.rirBefore, dil),
            son: formatWeight(sinyal.rirRecent, dil),
          })}
        </Text>
      )}
      {sinyal.ratedSessions > 0 && (
        <Text className="text-body text-muted">
          {t('asiriYuklenme.zorlukSatiri', { zor: sinyal.hardSessions, toplam: sinyal.ratedSessions })}
        </Text>
      )}
      <Text className="text-body text-muted">{t('asiriYuklenme.oneri')}</Text>
    </CamKart>
  );
}
