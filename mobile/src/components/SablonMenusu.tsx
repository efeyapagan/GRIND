import { useTranslation } from 'react-i18next';
import type { Sablon } from '@grind/shared/api/queries';
import type { SablonOzeti } from '@grind/shared/lib/sablonOzeti';
import SablonVitrinKarti, { KART_YUKSEKLIGI } from '../ui/SablonVitrinKarti';
import BasiliTutmaMenusu, { type Kutu } from './BasiliTutmaMenusu';

export type { Kutu };

interface Props {
  sablon: Sablon;
  ozet: SablonOzeti;
  /** Karuseldeki kartin genisligi -- onizleme ayni kartin buyutulmus halidir. */
  kartGenisligi: number;
  /** Kartin ekrandaki yeri; olculemediyse `null` (onizleme ortada belirir). */
  kaynak: Kutu | null;
  /** Kapanis animasyonu bittikten sonra cagrilir; menuyu kaldirmak cagiranin isidir. */
  onKapat: () => void;
  onDuzenle: () => void;
  onSil: () => void;
}

/** #439: sablon kartina basili tutunca acilan menu; animasyon ve panel `BasiliTutmaMenusu`ndadir (#623). */
export default function SablonMenusu({ sablon, ozet, kartGenisligi, kaynak, onKapat, onDuzenle, onSil }: Props) {
  const { t } = useTranslation();
  return (
    <BasiliTutmaMenusu
      testID="sablon-menusu"
      kartGenisligi={kartGenisligi}
      kartYuksekligi={KART_YUKSEKLIGI}
      kaynak={kaynak}
      onKapat={onKapat}
      onDuzenle={onDuzenle}
      onSil={onSil}
      duzenleEtiketi={t('sablonlar.duzenleBaslik')}
      silEtiketi={t('sablonlar.sil')}
      silOnayMesaji={t('sablonlar.silOnayMesaji')}
    >
      <SablonVitrinKarti
        ad={sablon.name}
        ozet={ozet}
        hareketSayisi={sablon.exercises.length}
        genislik={kartGenisligi}
        onBasla={() => {}}
        onMenu={() => {}}
        disabled={false}
        lastUsedAt={sablon.lastUsedAt}
      />
    </BasiliTutmaMenusu>
  );
}
