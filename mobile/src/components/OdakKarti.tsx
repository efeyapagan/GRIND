import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react-native';
import type { HareketIlerlemesi, SetKaydi } from '@grind/shared/api/queries';
import HareketGecmisi from './HareketGecmisi';
import HareketKartiGovdesi from './HareketKartiGovdesi';
import CamYuzey from '../ui/CamYuzey';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  hareket: HareketIlerlemesi;
  /** Antrenmandaki hareketlerin sirali id'leri -- kartin sirasi buradan. */
  idler: number[];
  /** Yalnizca bu hareketin bu antrenmandaki setleri. */
  setler: SetKaydi[];
  onSetDuzenle: (kayit: SetKaydi, sira: number) => void;
  onKaldir: () => void;
  /** #357: karti ve set panelini birlikte kapatir. */
  onKapat: () => void;
}

/**
 * #354: set paneli acikken secili hareketin buyuyerek one cikan karti -- set paneliyle ayni "liquid
 * glass" yuzey (`CamYuzey`, #350). Kendisine verilen yuksekligi doldurur, icerigi (setler, hareket
 * gecmisi, kaldirma; sira #407 ile listede surukleyerek degisir) kendi icinde kayar.
 */
export default function OdakKarti({ hareket, idler, setler, onSetDuzenle, onKaldir, onKapat }: Props) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const sira = idler.indexOf(hareket.exerciseId);
  return (
    <View testID="odak-karti" className="flex-1 overflow-hidden rounded-xl border border-surface-4">
      <CamYuzey />
      <ScrollView contentContainerClassName="flex-col gap-3 p-4" keyboardShouldPersistTaps="handled">
        <HareketKartiGovdesi hareket={hareket} sira={sira} setler={setler} onSetDuzenle={onSetDuzenle} onKapat={onKapat} />
        <HareketGecmisi exerciseId={hareket.exerciseId} exerciseName={hareket.exerciseName} />
        <Pressable onPress={onKaldir} className="h-12 flex-row items-center justify-center gap-2 rounded-xl">
          <Trash2 color={ikonRenk.danger} size={18} />
          <Text className="text-label text-danger">{t('antrenman.hareketiKaldir')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
