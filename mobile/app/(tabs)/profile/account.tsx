import { useState } from 'react';
import { Platform, Text } from 'react-native';
import { KeyRound, LogOut } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../src/auth/AuthContext';
import { usePageTitle } from '@grind/shared/pageTitle';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';
import CamKart from '../../../src/ui/CamKart';
import HaftalikHedefSatiri from '../../../src/components/HaftalikHedefSatiri';
import AntrenmanHedefiSecici from '../../../src/components/AntrenmanHedefiSecici';
import GizlilikSeviyesiSecici from '../../../src/components/GizlilikSeviyesiSecici';
import TemaSecici from '../../../src/components/TemaSecici';
import SesliBildirimSecici from '../../../src/components/SesliBildirimSecici';
import DilSecici from '../../../src/components/DilSecici';
import SifreDegistirPenceresi from '../../../src/components/SifreDegistirPenceresi';
import { useCevrimiciEylem } from '../../../src/baglanti/useCevrimiciEylem';
import { useIkonRenk } from '../../../src/ui/renkler';

/**
 * web/src/pages/ProfilePage.tsx ile ayni (issue #119, kullanici karariyla sadelestirildi). #283'ten beri
 * sekme degil, profil basligindaki Hesap ayarlari dugmesinin actigi ekran.
 *
 * #372: gorunen isim, kullanici adi ve dogum tarihi BURADA DEGIL, "Profili duzenle"de.
 * #378 (kullanici karari): "Sifre degistir" ise burada, cikisin hemen USTUNDE -- kullanici adi
 * teyit istemedigi icin sifre degisimi kimlik duzenlemenin degil, hesap islemlerinin yanina
 * dustu.
 */
export default function AccountScreen() {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  usePageTitle(t('ortak.hesapAyarlari'));
  const { logout } = useAuth();

  return (
    <EkranKaydirici contentContainerClassName="gap-6 px-4 pt-2 pb-4">
      {/* #592: gruplar ve dugmeler cam (spec Karar 9); icteki secici alanlari alan olarak kalir. */}
      <CamKart className="flex-col gap-3 p-4">
        <Text className="text-heading text-fg">{t('profil.antrenmanHedefi')}</Text>
        <HaftalikHedefSatiri />
        <AntrenmanHedefiSecici />
      </CamKart>
      <CamKart className="flex-col gap-3 p-4">
        <GizlilikSeviyesiSecici />
        <TemaSecici />
        <DilSecici />
        {/* #414: simdilik yalnizca iOS (Android'in sayac bildirimi sonraki dilim). */}
        {Platform.OS === 'ios' && <SesliBildirimSecici />}
      </CamKart>
      <SifreDegistirDugmesi />
      <CamKart
        onPress={logout}
        accessibilityLabel={t('profil.cikisYap')}
        koseSinifi="rounded-xl"
        className="min-h-12 flex-row items-center justify-center gap-2 p-4"
      >
        <LogOut color={ikonRenk.danger} size={18} />
        <Text className="text-label text-danger">{t('profil.cikisYap')}</Text>
      </CamKart>
    </EkranKaydirici>
  );
}

/** Form ortada acilan pencerede; buradaki yalnizca onu acan dugme (#372/#378). */
function SifreDegistirDugmesi() {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const { updateProfile } = useAuth();
  // #174: sifre degistirme cevrimdisi calismaz, uyari cikar.
  const cevrimici = useCevrimiciEylem();
  const [acik, setAcik] = useState(false);

  return (
    <>
      <CamKart
        onPress={cevrimici(() => setAcik(true))}
        accessibilityLabel={t('profil.sifreDegistir')}
        koseSinifi="rounded-xl"
        className="min-h-12 flex-row items-center justify-center gap-2 p-4"
      >
        <KeyRound color={ikonRenk.fg} size={18} />
        <Text className="text-label text-fg">{t('profil.sifreDegistir')}</Text>
      </CamKart>
      {acik && (
        <SifreDegistirPenceresi acik={acik} onKapat={() => setAcik(false)} updateProfile={updateProfile} />
      )}
    </>
  );
}
