import { View, Text, Pressable } from 'react-native';
import { Check, CirclePlay, Plus } from 'lucide-react-native';
import type { HareketIlerlemesi, SetKaydi } from '@grind/shared/api/queries';
import SetSatiri from './SetSatiri';
import { ikonRenk } from '../ui/renkler';

interface Props {
  hareket: HareketIlerlemesi;
  sira: number;
  /** Yalnizca bu hareketin bu antrenmandaki setleri. */
  setler: SetKaydi[];
  onSetSil: (kayit: SetKaydi) => void;
  /** Listede baslik odak kartini acan dugmedir; odak kartinin kendisinde (#354) duz basliktir. */
  onSec?: () => void;
}

function setSayaci(hareket: HareketIlerlemesi): string {
  return hareket.plannedSets === null
    ? `${hareket.completedSets} set`
    : `${hareket.completedSets} / ${hareket.plannedSets} set`;
}

/**
 * Hareket kartinin baslik + set satirlari (#354): liste karti (`HareketKartlari`) ile set paneliyle
 * birlikte acilan odak karti (`OdakKarti`) ayni govdeyi cizer; yuzeyi ve ek ayrintilari cagiran verir.
 */
export default function HareketKartiGovdesi({ hareket, sira, setler, onSetSil, onSec }: Props) {
  const tamamlandi = hareket.plannedSets !== null && hareket.completedSets >= hareket.plannedSets;
  const sayac = setSayaci(hareket);
  const baslik = (
    <>
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <View className="size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3">
          {tamamlandi ? <Check color={ikonRenk.fg} size={18} /> : <Text className="text-label text-fg">{sira + 1}</Text>}
        </View>
        <Text numberOfLines={1} className="flex-1 text-heading text-fg">
          {hareket.exerciseName}
        </Text>
        {onSec && <CirclePlay color={ikonRenk.muted} size={18} style={{ opacity: 0.5 }} />}
      </View>
      <View className="shrink-0 flex-row items-center gap-1">
        <Text className="text-label-xs text-muted uppercase">{sayac}</Text>
        {onSec && <Plus color={ikonRenk.muted} size={14} />}
      </View>
    </>
  );

  return (
    <>
      {onSec ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${hareket.exerciseName}, ${sayac}`}
          onPress={onSec}
          className="min-h-12 w-full flex-row items-center justify-between gap-2"
        >
          {baslik}
        </Pressable>
      ) : (
        <View className="min-h-12 w-full flex-row items-center justify-between gap-2">{baslik}</View>
      )}
      {setler.length > 0 && (
        <View className="flex-col gap-1">
          {setler.map((kayit, setSirasi) => (
            <SetSatiri key={kayit.id} kayit={kayit} sira={setSirasi + 1} onSil={onSetSil} />
          ))}
        </View>
      )}
    </>
  );
}
