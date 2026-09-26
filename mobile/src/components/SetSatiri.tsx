import { View, Text, Pressable } from 'react-native';
import { useDil } from '@grind/shared/i18n';
import type { SetKaydi } from '@grind/shared/api/queries';
import { formatWeight } from '@grind/shared/lib/format';
import { rekorRozetiMetni } from '@grind/shared/lib/rekor';
import { rirEtiketi } from '@grind/shared/lib/rir';
import Rozet from '../ui/Rozet';
import Hap from '../ui/Hap';
import DinlenmeHapi from '../ui/DinlenmeHapi';
import { kalanSureMetni } from '@grind/shared/lib/dinlenme';

interface Props {
  kayit: SetKaydi;
  sira: number;
  /** #396: duzenleyici satirin yerinde degil ekranin ortasinda acilir -- acmak ekranin isi. */
  onDuzenle: (kayit: SetKaydi, sira: number) => void;
}

/**
 * Bugun ekraninin set satiri (issue #57): satirin KENDISI bir dugmedir, dokununca `SetDuzenleyici`
 * acilir (#396'dan beri ekranin ortasinda, bkz. antrenman.tsx).
 */
export default function SetSatiri({ kayit, sira, onDuzenle }: Props) {
  const dil = useDil();

  const rozet = rekorRozetiMetni(kayit);
  const erisilebilirAd = [
    `${sira}. set`,
    `${formatWeight(kayit.weight, dil)} kg × ${kayit.reps}`,
    rozet,
    kayit.rir !== null ? `RIR ${rirEtiketi(kayit.rir)}` : null,
    kayit.restSeconds !== null ? `dinlenme ${kalanSureMetni(kayit.restSeconds * 1000)}` : null,
    'düzenle',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={erisilebilirAd}
      onPress={() => onDuzenle(kayit, sira)}
      className="w-full flex-row items-center justify-between gap-2 rounded-lg bg-surface-2 p-2"
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-4">
        <Text className="w-12 shrink-0 text-label text-muted">{sira}. Set</Text>
        {/* Rekor rozeti HER ZAMAN alt satirda (kullanici karari): sigdiginda yan yana, sigmadiginda
            alta inen bir duzen satirdan satira farkli gorunuyordu. `SetList`teki gecmis satirlari da
            ayni duzeni kullanir. `flex-1` ayrica sart: RN'de varsayilan `flexShrink: 0`dir (web'in
            tersine), bu kutu daralmazsa uzun rozet sagdaki dinlenme/RIR haplarinin USTUNE tasar. */}
        <View className="min-w-0 flex-1 flex-col items-start gap-1">
          <Text className="text-metric text-fg">
            {formatWeight(kayit.weight, dil)} <Text className="text-body text-muted">kg</Text>{' '}
            <Text className="font-light text-muted">×</Text> {kayit.reps}
          </Text>
          {rozet && <Rozet>{rozet}</Rozet>}
        </View>
      </View>
      <View className="shrink-0 flex-row items-center gap-2">
        <DinlenmeHapi saniye={kayit.restSeconds} />
        {kayit.rir !== null && <Hap>RIR {rirEtiketi(kayit.rir)}</Hap>}
      </View>
    </Pressable>
  );
}
