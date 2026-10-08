import { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sesliBildirimiAyarla, useSesliBildirim } from '../bildirim/dinlenmeSesi';
import SecimKutusu from '../ui/SecimKutusu';

/**
 * #414: dinlenme bitince arka planda zil calsin mi. Acilinca bildirim izni (yalnizca ses) sorulur; verilmezse
 * tercih kapali kalir ve izni telefon ayarlarindan acmak gerektigi yazilir.
 */
export default function SesliBildirimSecici() {
  const { t } = useTranslation();
  const acik = useSesliBildirim();
  const [izinYok, setIzinYok] = useState(false);

  const secenekler = [
    { deger: 'acik' as const, etiket: t('profil.sesliBildirimAcik') },
    { deger: 'kapali' as const, etiket: t('profil.sesliBildirimKapali') },
  ];

  return (
    <View className="flex-col gap-1">
      <Text className="text-label text-muted">{t('profil.sesliBildirim')}</Text>
      <SecimKutusu
        baslik={t('profil.sesliBildirim')}
        secenekler={secenekler}
        deger={acik ? 'acik' : 'kapali'}
        onDegistir={(istenen) => void sesliBildirimiAyarla(istenen === 'acik').then((oldu) => setIzinYok(!oldu))}
      />
      {izinYok ? (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {t('profil.sesliBildirimIzinYok')}
        </Text>
      ) : (
        <Text className="text-label text-muted">{t('profil.sesliBildirimAciklama')}</Text>
      )}
    </View>
  );
}
