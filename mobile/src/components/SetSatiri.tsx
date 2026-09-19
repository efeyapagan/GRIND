import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { SetKaydi } from '@grind/shared/api/queries';
import { formatWeight } from '@grind/shared/lib/format';
import { rekorRozetiMetni } from '@grind/shared/lib/rekor';
import Rozet from '../ui/Rozet';
import Hap from '../ui/Hap';
import DinlenmeHapi from '../ui/DinlenmeHapi';
import { kalanSureMetni } from '@grind/shared/lib/dinlenme';
import SetDuzenleyici from './SetDuzenleyici';

interface Props {
  kayit: SetKaydi;
  sira: number;
  onSil: (kayit: SetKaydi) => void;
}

/**
 * Bugun ekraninin set satiri (issue #57): satirin KENDISI bir dugmedir, dokununca yerinde
 * `SetDuzenleyici` acilir.
 */
export default function SetSatiri({ kayit, sira, onSil }: Props) {
  const [duzenleniyor, setDuzenleniyor] = useState(false);

  if (duzenleniyor) {
    return (
      <SetDuzenleyici
        kayit={kayit}
        sira={sira}
        onKapat={() => setDuzenleniyor(false)}
        onSil={() => onSil(kayit)}
      />
    );
  }

  const rozet = rekorRozetiMetni(kayit);
  const erisilebilirAd = [
    `${sira}. set`,
    `${formatWeight(kayit.weight)} kg × ${kayit.reps}`,
    rozet,
    kayit.rir !== null ? `RIR ${kayit.rir}` : null,
    kayit.restSeconds !== null ? `dinlenme ${kalanSureMetni(kayit.restSeconds * 1000)}` : null,
    'düzenle',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={erisilebilirAd}
      onPress={() => setDuzenleniyor(true)}
      className="w-full flex-row items-center justify-between gap-2 rounded-lg bg-surface-2 p-2"
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-4">
        <Text className="w-12 shrink-0 text-label text-muted">{sira}. Set</Text>
        <View className="min-w-0 flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <Text className="text-metric text-fg">
            {formatWeight(kayit.weight)} <Text className="text-body text-muted">kg</Text>{' '}
            <Text className="font-light text-muted">×</Text> {kayit.reps}
          </Text>
          {rozet && <Rozet>{rozet}</Rozet>}
        </View>
      </View>
      <View className="shrink-0 flex-row items-center gap-2">
        <DinlenmeHapi saniye={kayit.restSeconds} />
        {kayit.rir !== null && <Hap>RIR {kayit.rir}</Hap>}
      </View>
    </Pressable>
  );
}
