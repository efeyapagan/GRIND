import { View, Text, Pressable } from 'react-native';
import { Check, CirclePlay, Plus, Trash2 } from 'lucide-react-native';
import type { HareketIlerlemesi, SetKaydi } from '@grind/shared/api/queries';
import HareketGecmisi from './HareketGecmisi';
import SetSatiri from './SetSatiri';
import { ikonRenk } from '../ui/renkler';

interface Props {
  ilerleme: HareketIlerlemesi[];
  setler: SetKaydi[];
  secilenId: number | null;
  onSec: (exerciseId: number) => void;
  onSetSil: (kayit: SetKaydi) => void;
  onHareketKaldir: (exerciseId: number) => void;
}

function setSayaci(hareket: HareketIlerlemesi): string {
  return hareket.plannedSets === null
    ? `${hareket.completedSets} set`
    : `${hareket.completedSets} / ${hareket.plannedSets} set`;
}

/** web/src/components/HareketKartlari.tsx ile ayni (spec Karar 5; #60/#62). */
export default function HareketKartlari({ ilerleme, setler, secilenId, onSec, onSetSil, onHareketKaldir }: Props) {
  return (
    <View className="flex-col gap-4">
      {ilerleme.map((hareket, sira) => {
        const secili = hareket.exerciseId === secilenId;
        const tamamlandi = hareket.plannedSets !== null && hareket.completedSets >= hareket.plannedSets;
        const hareketSetleri = setler.filter((kayit) => kayit.exerciseId === hareket.exerciseId);
        const sayac = setSayaci(hareket);

        return (
          <View
            key={hareket.exerciseId}
            className={`flex-col gap-2 rounded-xl bg-surface-1 p-4 ${secili ? 'ring-1 ring-muted' : ''}`}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: secili }}
              accessibilityLabel={`${hareket.exerciseName}, ${sayac}`}
              onPress={() => onSec(hareket.exerciseId)}
              className="min-h-12 w-full flex-row items-center justify-between gap-2"
            >
              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                <View className="size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3">
                  {tamamlandi ? <Check color={ikonRenk.fg} size={18} /> : <Text className="text-label text-fg">{sira + 1}</Text>}
                </View>
                <Text numberOfLines={1} className="flex-1 text-heading text-fg">
                  {hareket.exerciseName}
                </Text>
                <CirclePlay color={ikonRenk.muted} size={18} style={{ opacity: 0.5 }} />
              </View>
              <View className="shrink-0 flex-row items-center gap-1">
                <Text className="text-label-xs text-muted uppercase">{sayac}</Text>
                <Plus color={ikonRenk.muted} size={14} />
              </View>
            </Pressable>
            {hareketSetleri.length > 0 && (
              <View className="flex-col gap-1">
                {hareketSetleri.map((kayit, setSirasi) => (
                  <SetSatiri key={kayit.id} kayit={kayit} sira={setSirasi + 1} onSil={onSetSil} />
                ))}
              </View>
            )}
            {secili && (
              <>
                <HareketGecmisi exerciseId={hareket.exerciseId} exerciseName={hareket.exerciseName} />
                <Pressable
                  onPress={() => onHareketKaldir(hareket.exerciseId)}
                  className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
                >
                  <Trash2 color={ikonRenk.danger} size={18} />
                  <Text className="text-label text-danger">Hareketi kaldır</Text>
                </Pressable>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}
