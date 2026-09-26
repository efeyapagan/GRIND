import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DILLER, type Dil } from '@grind/shared/i18n';
import { useDilTercihi } from '../ui/DilContext';
import SecimKutusu from '../ui/SecimKutusu';

/** Dilin KENDI adiyla yazilir: "English"i anlamayan biri Ingilizce'yi bulamaz (web DilSecici deseni). */
const DIL_ADLARI: Record<Dil, string> = {
  tr: 'Türkçe', // i18n-muaf: dil adlari her arayuz dilinde kendi dillerinde yazilir
  en: 'English',
};

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
