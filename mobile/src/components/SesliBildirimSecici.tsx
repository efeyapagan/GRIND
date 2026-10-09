import { useState } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sesliBildirimiAyarla, useSesliBildirim } from '../bildirim/dinlenmeSesi';
import AnahtarSatiri from '../ui/AnahtarSatiri';

/**
 * #414: dinlenme bitince arka planda zil calsin mi. Acilinca bildirim izni sorulur; verilmezse tercih kapali
 * kalir ve izni telefon ayarlarindan acmak gerektigi yazilir.
 */
export default function SesliBildirimSecici() {
  const { t } = useTranslation();
  const acik = useSesliBildirim();
  const [izinYok, setIzinYok] = useState(false);
  // Android'de ayni tercih ust paneldeki geri sayimi da acar (orada her bildirim izin ister).
  const android = Platform.OS === 'android';

  return (
    <AnahtarSatiri
      etiket={t(android ? 'profil.dinlenmeBildirimi' : 'profil.sesliBildirim')}
      aciklama={t(android ? 'profil.dinlenmeBildirimiAciklama' : 'profil.sesliBildirimAciklama')}
      hata={izinYok ? t('profil.sesliBildirimIzinYok') : null}
      deger={acik}
      onDegistir={(istenen) => void sesliBildirimiAyarla(istenen).then((oldu) => setIzinYok(!oldu))}
    />
  );
}
