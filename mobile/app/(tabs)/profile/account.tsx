import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { KeyRound, LogOut } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../src/auth/AuthContext';
import { usePageTitle } from '@grind/shared/pageTitle';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';
import HaftalikHedefSatiri from '../../../src/components/HaftalikHedefSatiri';
import GizlilikSeviyesiSecici from '../../../src/components/GizlilikSeviyesiSecici';
import TemaSecici from '../../../src/components/TemaSecici';
import SifreDegistirPenceresi from '../../../src/components/SifreDegistirPenceresi';
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
      <View className="flex-col gap-3 rounded-xl bg-surface-1 p-4">
        <Text className="text-heading text-fg">Antrenman hedefi</Text>
        <HaftalikHedefSatiri />
      </View>
      <View className="flex-col gap-3 rounded-xl bg-surface-1 p-4">
        <GizlilikSeviyesiSecici />
        <TemaSecici />
      </View>
      <SifreDegistirDugmesi />
      <Pressable
        onPress={logout}
        className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-surface-1 p-4"
      >
        <LogOut color={ikonRenk.danger} size={18} />
        <Text className="text-label text-danger">Çıkış yap</Text>
      </Pressable>
    </EkranKaydirici>
  );
}

/** Form ortada acilan pencerede; buradaki yalnizca onu acan dugme (#372/#378). */
function SifreDegistirDugmesi() {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const { updateProfile } = useAuth();
  const [acik, setAcik] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setAcik(true)}
        className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-surface-1 p-4"
      >
        <KeyRound color={ikonRenk.fg} size={18} />
        <Text className="text-label text-fg">{t('profil.sifreDegistir')}</Text>
      </Pressable>
      {acik && (
        <SifreDegistirPenceresi acik={acik} onKapat={() => setAcik(false)} updateProfile={updateProfile} />
      )}
    </>
  );
}
