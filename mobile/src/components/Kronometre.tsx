import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, Square } from 'lucide-react-native';
import { kalanSureMetni } from '@grind/shared/lib/dinlenme';
import { EN_UZUN_SURE_SN } from '@grind/shared/lib/setGirdisi';
import IkincilDugme from '../ui/IkincilDugme';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  /** Durdurulunca gecen sure (saniye, 1–3600) -- set panelinin sure kutusuna yazilir. */
  onDurdur: (saniye: number) => void;
}

/**
 * #346: sureyle olculen harekette (plank) set suresini sayan kronometre. Baslangic ANI tutulur, gecen sure
 * her tikte ondan hesaplanir -- uygulama arka plana gidip gelse de sure dogru kalir (dinlenme sayaciyla
 * ayni ilke). Durdurunca sure kutuya yazilir; kutu elle de duzeltilebilir, set "Set ekle" ile kaydedilir.
 */
export default function Kronometre({ onDurdur }: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const [baslangicMs, setBaslangicMs] = useState<number | null>(null);
  const [simdi, setSimdi] = useState(() => Date.now());

  useEffect(() => {
    if (baslangicMs === null) {
      return;
    }
    const zamanlayici = setInterval(() => setSimdi(Date.now()), 250);
    return () => clearInterval(zamanlayici);
  }, [baslangicMs]);

  const gecenSaniye = baslangicMs === null ? 0 : Math.floor(Math.max(simdi - baslangicMs, 0) / 1000);
  const metin = kalanSureMetni(gecenSaniye * 1000);

  function bas() {
    if (baslangicMs === null) {
      const an = Date.now();
      setSimdi(an);
      setBaslangicMs(an);
      return;
    }
    const saniye = Math.round((Date.now() - baslangicMs) / 1000);
    setBaslangicMs(null);
    onDurdur(Math.min(Math.max(saniye, 1), EN_UZUN_SURE_SN));
  }

  return (
    <IkincilDugme
      testID="kronometre"
      accessibilityLabel={`${t('setGirdisi.kronometreEtiketi', { sure: metin })}, ${t(
        baslangicMs === null ? 'setGirdisi.kronometreBaslat' : 'setGirdisi.kronometreDurdur',
      )}`}
      onPress={bas}
    >
      {baslangicMs === null ? <Play color={ikonRenk.fg} size={18} /> : <Square color={ikonRenk.fg} size={18} />}
      <Text className="text-label text-fg">
        {baslangicMs === null ? t('setGirdisi.kronometreBaslat') : `${metin} · ${t('setGirdisi.kronometreDurdur')}`}
      </Text>
    </IkincilDugme>
  );
}
