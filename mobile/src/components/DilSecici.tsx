import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DILLER } from '@grind/shared/i18n';
import { DIL_ADLARI } from '@grind/shared/i18n/dil';
import { useDilTercihi } from '../ui/DilContext';
import SecimKutusu from '../ui/SecimKutusu';

/** Hesap ayarlarindaki arayuz dili secici (#263 dilim 1). TemaSecici ile ayni desen. */
export default function DilSecici() {
  const { t } = useTranslation();
  const { dil, setDil } = useDilTercihi();

  return (
    <View className="flex-col gap-1">
      <Text className="text-label text-muted">{t('dil.etiket')}</Text>
      <SecimKutusu
        baslik={t('dil.etiket')}
        secenekler={DILLER.map((secenek) => ({ deger: secenek, etiket: DIL_ADLARI[secenek] }))}
        deger={dil}
        onDegistir={setDil}
      />
    </View>
  );
}
