import { useTranslation } from 'react-i18next';
import type { Egzersiz } from '@grind/shared/api/queries';
import HareketSecimPenceresi from '../ui/HareketSecimPenceresi';

interface Props {
  acik: boolean;
  egzersizler: readonly Egzersiz[];
  onSec: (exerciseId: number) => void;
  onKapat: () => void;
}

/**
 * Antrenmana hareket ekleme (#62). Eskiden alt alandaki kartin icinde satir ici bir liste (`HareketSecici`)
 * aciliyordu: sayfanin ScrollView'inda mutlak konumlu oldugu icin kaydirirken ya da klavye inerken arama
 * alani odagi kaybedip listeyi kapatiyordu. Artik ilerleme kartlariyla ayni PENCERE (`HareketSecimPenceresi`).
 * Liste cagiranin verdigi hareketlerdir -- antrenmanda zaten olanlar orada olmaz.
 */
export default function HareketEklePaneli({ acik, egzersizler, onSec, onKapat }: Props) {
  const { t } = useTranslation();
  return (
    <HareketSecimPenceresi
      acik={acik}
      onKapat={onKapat}
      baslik={t('antrenman.hareketEkle')}
      egzersizler={egzersizler}
      onSec={onSec}
    />
  );
}
