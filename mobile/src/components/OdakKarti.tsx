import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import type { HareketIlerlemesi, SetKaydi } from '@grind/shared/api/queries';
import { yonleTasi } from '@grind/shared/lib/siralama';
import HareketGecmisi from './HareketGecmisi';
import HareketKartiGovdesi from './HareketKartiGovdesi';
import CamYuzey from '../ui/CamYuzey';
import IkonDugmesi from '../ui/IkonDugmesi';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  hareket: HareketIlerlemesi;
  /** Antrenmandaki hareketlerin sirali id'leri -- kartin sirasi ve yukari/asagi tasima buradan. */
  idler: number[];
  /** Yalnizca bu hareketin bu antrenmandaki setleri. */
  setler: SetKaydi[];
  onSetDuzenle: (kayit: SetKaydi, sira: number) => void;
  // #229: antrenmandaki TUM hareketlerin yeni sirasi; kaydi ekran yurutur.
  onSiraDegis: (exerciseIds: number[]) => void;
  onKaldir: () => void;
  /** #357: karti ve set panelini birlikte kapatir. */
  onKapat: () => void;
}

/**
 * #354: set paneli acikken secili hareketin buyuyerek one cikan karti -- set paneliyle ayni "liquid
 * glass" yuzey (`CamYuzey`, #350). Kendisine verilen yuksekligi doldurur, icerigi (setler, hareket
 * gecmisi, siralama, kaldirma) kendi icinde kayar.
 */
export default function OdakKarti({ hareket, idler, setler, onSetDuzenle, onSiraDegis, onKaldir, onKapat }: Props) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const sira = idler.indexOf(hareket.exerciseId);
  return (
    <View testID="odak-karti" className="flex-1 overflow-hidden rounded-xl border border-surface-4">
      <CamYuzey />
      <ScrollView contentContainerClassName="flex-col gap-3 p-4" keyboardShouldPersistTaps="handled">
        <HareketKartiGovdesi hareket={hareket} sira={sira} setler={setler} onSetDuzenle={onSetDuzenle} onKapat={onKapat} />
        <HareketGecmisi exerciseId={hareket.exerciseId} exerciseName={hareket.exerciseName} />
        <View className="flex-row items-center gap-1">
          <IkonDugmesi
            etiket={`${hareket.exerciseName}: ${t('ortak.yukariTasi')}`}
            onPress={() => onSiraDegis(yonleTasi(idler, sira, -1))}
            disabled={sira === 0}
          >
            <ChevronUp color={ikonRenk.muted} size={20} />
          </IkonDugmesi>
          <IkonDugmesi
            etiket={`${hareket.exerciseName}: ${t('ortak.asagiTasi')}`}
            onPress={() => onSiraDegis(yonleTasi(idler, sira, 1))}
            disabled={sira === idler.length - 1}
          >
            <ChevronDown color={ikonRenk.muted} size={20} />
          </IkonDugmesi>
          <Pressable onPress={onKaldir} className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl">
            <Trash2 color={ikonRenk.danger} size={18} />
            <Text className="text-label text-danger">{t('antrenman.hareketiKaldir')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
