import { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react-native';
import type { KardiyoAlani, KardiyoKaydi } from '@grind/shared/api/queries';
import {
  kardiyoGirdisi,
  kardiyoGirdisiniAyristir,
  kardiyoSuresiniAyristir,
  metreMi,
  sonucAlanlari,
  ayarAlanlari,
} from '@grind/shared/lib/kardiyo';
import BirincilDugme from '../ui/BirincilDugme';
import CamKatmanlari from '../ui/CamKatmanlari';
import IkincilDugme from '../ui/IkincilDugme';
import KardiyoAlanlari from './KardiyoAlanlari';
import KardiyoSureAlani from './KardiyoSureAlani';
import { useKardiyoAlanlari } from './useKardiyoAlanlari';
import { useKuyrukluKardiyoDuzelt } from '../kuyruk/kuyrukluMutasyonlar';
import { useIkonRenk } from '../ui/renkler';

interface Props {
  kayit: KardiyoKaydi;
  onKapat: () => void;
  onSil: () => void;
}

/** #647: bitmis kardiyo kaydinin duzenleyicisi -- set duzenleyicisiyle ayni yer ve yuzey (#396). */
export default function KardiyoDuzenleyici({ kayit, onKapat, onSil }: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const duzeltme = useKuyrukluKardiyoDuzelt();
  const tumAlanlar = useKardiyoAlanlari(kayit.exerciseId);
  const alanlar = [...sonucAlanlari(tumAlanlar), ...ayarAlanlari(tumAlanlar)];
  const metre = metreMi(tumAlanlar);
  const saniye = kayit.durationSeconds ?? 0;
  const [girdi, setGirdi] = useState(() => kardiyoGirdisi(kayit, alanlar, metre));
  const [sure, setSure] = useState({ dakika: String(Math.floor(saniye / 60)), saniye: String(saniye % 60) });
  const [hatalar, setHatalar] = useState<KardiyoAlani[]>([]);
  const [sureHatali, setSureHatali] = useState(false);
  const [genelHata, setGenelHata] = useState<string | null>(null);

  async function kaydet() {
    setGenelHata(null);
    const sonuc = kardiyoGirdisiniAyristir(girdi, alanlar, metre);
    const durationSeconds = kardiyoSuresiniAyristir(sure.dakika, sure.saniye);
    setHatalar(sonuc.hatalar);
    setSureHatali(durationSeconds === null);
    if (sonuc.hatalar.length > 0 || durationSeconds === null) return;
    try {
      await duzeltme.mutateAsync({ id: kayit.id, sessionId: kayit.sessionId, durationSeconds, ...sonuc.degerler });
      onKapat();
    } catch {
      setGenelHata(t('kardiyo.kaydedilemedi'));
    }
  }

  return (
    <View testID="kardiyo-duzenleyici" accessibilityLabel={t('kardiyo.kaydiDuzenle')} className="flex-col gap-3 overflow-hidden rounded-xl p-4">
      <CamKatmanlari koseSinifi="rounded-xl" />
      <Text numberOfLines={1} className="pl-1 text-label text-muted uppercase">
        {kayit.exerciseName}
      </Text>
      {genelHata && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {genelHata}
        </Text>
      )}
      <KardiyoSureAlani
        onek={`kardiyo-${kayit.id}-sure`}
        dakika={sure.dakika}
        saniye={sure.saniye}
        onDegis={(dakika, sn) => setSure({ dakika, saniye: sn })}
        hata={sureHatali ? t('kardiyo.gecersizDeger') : undefined}
      />
      <KardiyoAlanlari
        onek={`kardiyo-${kayit.id}`}
        alanlar={alanlar}
        metre={metre}
        girdi={girdi}
        onDegis={(alan, deger) => setGirdi((onceki) => ({ ...onceki, [alan]: deger }))}
        hatalar={hatalar}
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <IkincilDugme onPress={onSil} accessibilityLabel={t('kardiyo.kaydiSil')}>
            <Trash2 color={ikonRenk.danger} size={18} />
          </IkincilDugme>
        </View>
        <View className="flex-[3]">
          <BirincilDugme yukseklik="normal" disabled={duzeltme.isPending} onPress={kaydet}>
            <Text className="text-body font-bold text-on-accent">{t('kardiyo.kaydet')}</Text>
          </BirincilDugme>
        </View>
      </View>
    </View>
  );
}
