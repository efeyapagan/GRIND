import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable } from 'react-native';
import { Flame, Timer, Zap } from 'lucide-react-native';
import { useDil } from '@grind/shared/i18n';
import type { SetKaydi } from '@grind/shared/api/queries';
import { gecilmisRekorIdleri, rekorRozetiMetni } from '@grind/shared/lib/rekor';
import { setDegeriMetni } from '@grind/shared/lib/setDegeri';
import { rirEtiketi } from '@grind/shared/lib/rir';
import Rozet from '../ui/Rozet';
import Hap from '../ui/Hap';
import DinlenmeHapi from '../ui/DinlenmeHapi';
import SetSatiri from './SetSatiri';
import SetDegeriYazisi from './SetDegeriYazisi';

interface OrtakProps {
  sets: SetKaydi[];
  bosDurumMetni?: string;
}

type Props = OrtakProps &
  (
    | { varyant?: 'bugun'; onSetDuzenle: (kayit: SetKaydi, sira: number) => void }
    // #564: verilirse gecmis satirina basili tutmak Duzenle / Sil menusunu acar; verilmezse
    // (arkadasin gecmisi, #284) satir salt-okunurdur.
    | { varyant: 'gecmis'; onSetMenu?: (kayit: SetKaydi, sira: number) => void }
  );

interface EgzersizGrubu {
  exerciseId: number;
  exerciseName: string;
  sets: SetKaydi[];
}

/** web/src/components/SetList.tsx ile ayni: setler egzersize gore gruplanir. */
export default function SetList(props: Props) {
  const { t } = useTranslation();
  const dil = useDil();
  const { sets, bosDurumMetni = t('setler.bosDurum') } = props;
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
  const gecilmisRekorlar = useMemo(() => gecilmisRekorIdleri(sets), [sets]);

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
                {t('setler.setSayisi', { count: grup.sets.length })}
              </Text>
            </View>
            <View className="flex-col gap-1">
              {grup.sets.map((kayit, setSirasi) => {
                const rozet = rekorRozetiMetni(kayit);
                const sira = setSirasi + 1;
                const onSetMenu = props.onSetMenu;
                const satirSinifi = 'min-h-12 flex-col justify-center gap-1.5 rounded-lg bg-surface-1 px-4 py-2';
                const icerik = (
                  <>
                    <View className="flex-row items-center justify-between gap-2">
                      <View className="flex-row items-center gap-4">
                        <Text className="w-5 text-label text-muted">{sira}</Text>
                        <SetDegeriYazisi kayit={kayit} className="text-body-lg text-fg" birimSinifi="text-fg" />
                      </View>
                      <View className="flex-row items-center gap-2">
                        <DinlenmeHapi saniye={kayit.restSeconds} />
                        {kayit.rir !== null && <Hap>RIR {rirEtiketi(kayit.rir)}</Hap>}
                      </View>
                    </View>
                    {rozet && (
                      // #404: `items-start` olmadan sutun duzeni rozeti satirin sonuna kadar uzatiyordu.
                      <View className="items-start">
                        <Rozet
                          ikon={kayit.recordType === 'Weight' ? Zap : kayit.recordType === 'Duration' ? Timer : Flame}
                          tamYuvarlak
                          gecildi={gecilmisRekorlar.has(kayit.id)}
                        >
                          {rozet}
                        </Rozet>
                      </View>
                    )}
                  </>
                );
                if (!onSetMenu) {
                  return (
                    <View key={kayit.id} testID={`gecmis-set-${kayit.id}`} className={satirSinifi}>
                      {icerik}
                    </View>
                  );
                }
                // #564: sablon kartiyla ayni desen (`SablonKayitliKarti`) -- dokunus yok, basili tutmak
                // menuyu acar; ekran okuyucuda ayni menu `longpress` eylemiyle acilir.
                return (
                  <Pressable
                    key={kayit.id}
                    testID={`gecmis-set-${kayit.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('setler.setSirasi', { sira })}, ${setDegeriMetni(kayit, dil)}`}
                    accessibilityHint={t('gecmis.setMenusuIpucu')}
                    accessibilityActions={[{ name: 'longpress' }]}
                    onAccessibilityAction={(olay) => olay.nativeEvent.actionName === 'longpress' && onSetMenu(kayit, sira)}
                    onLongPress={() => onSetMenu(kayit, sira)}
                    className={satirSinifi}
                  >
                    {icerik}
                  </Pressable>
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
            <Text className="shrink-0 text-label-xs text-muted uppercase">{t('setler.setSayisi', { count: grup.sets.length })}</Text>
          </View>
          <View className="flex-col gap-1">
            {grup.sets.map((kayit, setSirasi) => (
              <SetSatiri key={kayit.id} kayit={kayit} sira={setSirasi + 1} onDuzenle={props.onSetDuzenle} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
