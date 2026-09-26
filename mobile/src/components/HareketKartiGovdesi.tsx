import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, CirclePlay, Plus, X } from 'lucide-react-native';
import type { HareketIlerlemesi, SetKaydi } from '@grind/shared/api/queries';
import { hedefTamamlandi } from '@grind/shared/lib/ilerleme';
import SetSatiri from './SetSatiri';
import IkonDugmesi from '../ui/IkonDugmesi';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  hareket: HareketIlerlemesi;
  sira: number;
  /** Yalnizca bu hareketin bu antrenmandaki setleri. */
  setler: SetKaydi[];
  onSetDuzenle: (kayit: SetKaydi, sira: number) => void;
  /** Listede baslik odak kartini acan dugmedir; odak kartinin kendisinde (#354) duz basliktir. */
  onSec?: () => void;
  /** #357: odak kartinda basligin en solundaki kapatma dugmesi -- karti ve set panelini birlikte kapatir. */
  onKapat?: () => void;
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
export default function HareketKartiGovdesi({ hareket, sira, setler, onSetDuzenle, onSec, onKapat }: Props) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const tamamlandi = hedefTamamlandi(hareket);
  const sayac = setSayaci(hareket);
  const baslik = (
    <>
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        {onKapat && (
          <IkonDugmesi etiket={t('setler.paneliKapat')} onPress={onKapat}>
            <X color={ikonRenk.muted} size={20} />
          </IkonDugmesi>
        )}
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
            <SetSatiri key={kayit.id} kayit={kayit} sira={setSirasi + 1} onDuzenle={onSetDuzenle} />
          ))}
        </View>
      )}
    </>
  );
}
