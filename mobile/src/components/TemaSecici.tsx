import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTema, type TemaTercihi } from '../ui/TemaContext';
import SecimKutusu from '../ui/SecimKutusu';

/**
 * Kullanicinin mobil uygulamanin temasini secebildigi bilesen (#271).
 * Sistem varsayilani, Acik veya Koyu.
 */
export default function TemaSecici() {
  const { t } = useTranslation();
  const { tercih, setTercih } = useTema();

  const secenekler = [
    { deger: 'sistem' as TemaTercihi, etiket: t('profil.temaSistem') },
    { deger: 'koyu' as TemaTercihi, etiket: t('profil.temaKoyu') },
    { deger: 'acik' as TemaTercihi, etiket: t('profil.temaAcik') },
  ];

  return (
    <View className="flex-col gap-1">
      <Text className="text-label text-muted">{t('profil.tema')}</Text>
      <SecimKutusu
        baslik={t('profil.tema')}
        secenekler={secenekler}
        deger={tercih}
        onDegistir={setTercih}
      />
    </View>
  );
}
