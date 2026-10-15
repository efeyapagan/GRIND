import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import SayiAlani from '../ui/SayiAlani';

interface Props {
  onek: string;
  dakika: string;
  saniye: string;
  onDegis: (dakika: string, saniye: string) => void;
  hata?: string;
}

/** #647: kardiyo suresinin elle duzeltilen iki kutusu (dakika + saniye) -- panelin sonuc adimi ve duzenleyici. */
export default function KardiyoSureAlani({ onek, dakika, saniye, onDegis, hata }: Props) {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-2">
      <View className="flex-1">
        <SayiAlani
          id={`${onek}-dakika`}
          etiket={t('kardiyo.sureEtiket')}
          birim={t('kardiyo.dakikaBirimi')}
          inputMode="numeric"
          placeholder="0"
          value={dakika}
          onChange={(deger) => onDegis(deger, saniye)}
          hata={hata}
        />
      </View>
      <View className="flex-1">
        <SayiAlani
          id={`${onek}-saniye`}
          etiket={t('kardiyo.sureEtiket')}
          birim={t('kardiyo.saniyeBirimi')}
          inputMode="numeric"
          placeholder="0"
          value={saniye}
          onChange={(deger) => onDegis(dakika, deger)}
        />
      </View>
    </View>
  );
}
