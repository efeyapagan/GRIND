import { useState } from 'react';
import { Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react-native';
import type { Egzersiz } from '@grind/shared/api/queries';
import HareketSecimPenceresi from './HareketSecimPenceresi';
import { useIkonRenk } from './renkler';

interface Props {
  egzersizler: readonly Egzersiz[];
  /** `null` = "tum hareketler" secili (yalnizca `tumEtiketi` verildiyse anlamli). */
  secilenId: number | null;
  /** Basliktaki ad; secim yokken `tumEtiketi`. */
  secilenAd: string;
  onSec: (exerciseId: number | null) => void;
  /** Verilirse listenin basinda bu etiketle bir "tum hareketler" satiri cizilir; secilince `onSec(null)`. */
  tumEtiketi?: string;
}

/**
 * #586: Ilerleme kartlarinin basligindaki hareket secimi. Kart basligi (ad + ok) dokununca bir PENCERE
 * acar -- kartin altina acilan liste (`HareketSecici`) ekranin sonundaki kartta kaydirma alaninin disina
 * tasip dokunulamaz kaliyordu. Pencerenin kendisi `HareketSecimPenceresi`dir.
 */
export default function HareketSecimKutusu({ egzersizler, secilenId, secilenAd, onSec, tumEtiketi }: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const [acik, setAcik] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('ilerleme.hareketDegistir')}: ${secilenAd}`}
        onPress={() => setAcik(true)}
        className="min-h-11 flex-row items-center justify-between gap-2"
      >
        <Text numberOfLines={1} className="flex-1 text-heading text-fg">
          {secilenAd}
        </Text>
        <ChevronDown color={ikonRenk.muted} size={18} />
      </Pressable>

      <HareketSecimPenceresi
        acik={acik}
        onKapat={() => setAcik(false)}
        baslik={t('ilerleme.hareketSec')}
        egzersizler={egzersizler}
        secilenId={secilenId}
        onSec={onSec}
        tum={tumEtiketi !== undefined ? { etiket: tumEtiketi, onSec: () => onSec(null) } : undefined}
      />
    </>
  );
}
