import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Flame, Zap } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import type { SetKaydi } from '@grind/shared/api/queries';
import { formatWeight } from '@grind/shared/lib/format';
import { rekorRozetiMetni } from '@grind/shared/lib/rekor';
import Rozet from '../ui/Rozet';
import Hap from '../ui/Hap';
import DinlenmeHapi from '../ui/DinlenmeHapi';
import SetSatiri from './SetSatiri';

interface OrtakProps {
  sets: SetKaydi[];
  bosDurumMetni?: string;
}

type Props = OrtakProps &
  ({ varyant?: 'bugun'; onSetSil: (kayit: SetKaydi) => void } | { varyant: 'gecmis' });

interface EgzersizGrubu {
  exerciseId: number;
  exerciseName: string;
  sets: SetKaydi[];
}

/** web/src/components/SetList.tsx ile ayni: setler egzersize gore gruplanir. */
export default function SetList(props: Props) {
  const dil = useDil();
  const { sets, bosDurumMetni = 'Bugün henüz set eklenmedi.' } = props;
  const gruplar = useMemo(() => {
    const harita = new Map<number, EgzersizGrubu>();
    for (const kayit of sets) {
      const mevcutGrup = harita.get(kayit.exerciseId);
      if (mevcutGrup) {
        mevcutGrup.sets.push(kayit);
      } else {
        harita.set(kayit.exerciseId, {
          exerciseId: kayit.exerciseId,
          exerciseName: kayit.exerciseName,
          sets: [kayit],
        });
      }
    }
    return Array.from(harita.values());
  }, [sets]);

  if (gruplar.length === 0) {
    return <Text className="text-body text-muted">{bosDurumMetni}</Text>;
  }

  if (props.varyant === 'gecmis') {
    return (
      <View className="flex-col gap-5">
        {gruplar.map((grup) => (
          <View key={grup.exerciseId} className="flex-col gap-2">
            <View className="flex-row items-center justify-between gap-2 px-1">
              <Text numberOfLines={1} className="flex-1 text-body-lg font-semibold text-fg">
                {grup.exerciseName}
              </Text>
              <Text className="shrink-0 rounded bg-surface-1 px-2 py-0.5 text-label-xs text-muted uppercase">
                {grup.sets.length} set
              </Text>
            </View>
            <View className="flex-col gap-1">
              {grup.sets.map((kayit, setSirasi) => {
                const rozet = rekorRozetiMetni(kayit);
                return (
                  <View
                    key={kayit.id}
                    className="min-h-12 flex-col justify-center gap-1.5 rounded-lg bg-surface-1 px-4 py-2"
                  >
                    <View className="flex-row items-center justify-between gap-2">
                      <View className="flex-row items-center gap-4">
                        <Text className="w-5 text-label text-muted">{setSirasi + 1}</Text>
                        <Text className="text-body-lg text-fg">
                          {formatWeight(kayit.weight, dil)} kg{' '}
                          <Text className="font-light text-muted">×</Text> {kayit.reps}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <DinlenmeHapi saniye={kayit.restSeconds} />
                        {kayit.rir !== null && <Hap>RIR {kayit.rir}</Hap>}
                      </View>
                    </View>
                    {rozet && (
                      <View>
                        <Rozet ikon={kayit.recordType === 'Weight' ? Zap : Flame} tamYuvarlak>
                          {rozet}
                        </Rozet>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-col gap-5">
      {gruplar.map((grup, grupSirasi) => (
        <View key={grup.exerciseId} className="flex-col gap-2 rounded-xl bg-surface-1 p-4">
          <View className="flex-row items-center justify-between gap-2 pb-1">
            <View className="min-w-0 flex-1 flex-row items-center gap-2">
              <View className="size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3">
                <Text className="text-label text-fg">{grupSirasi + 1}</Text>
              </View>
              <Text numberOfLines={1} className="flex-1 text-heading text-fg">
                {grup.exerciseName}
              </Text>
            </View>
            <Text className="shrink-0 text-label-xs text-muted uppercase">{grup.sets.length} set</Text>
          </View>
          <View className="flex-col gap-1">
            {grup.sets.map((kayit, setSirasi) => (
              <SetSatiri key={kayit.id} kayit={kayit} sira={setSirasi + 1} onSil={props.onSetSil} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
