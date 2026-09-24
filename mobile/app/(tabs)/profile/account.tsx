import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../src/auth/AuthContext';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { usePageTitle } from '@grind/shared/pageTitle';
import SifreAlani from '../../../src/ui/SifreAlani';
import HataKutusu from '../../../src/ui/HataKutusu';
import BirincilDugme from '../../../src/ui/BirincilDugme';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';
import HaftalikHedefSecici from '../../../src/components/HaftalikHedefSecici';
import GizlilikSeviyesiSecici from '../../../src/components/GizlilikSeviyesiSecici';
import { ikonRenk } from '../../../src/ui/renkler';

const MIN_SIFRE_KARAKTER = 8;
const MAKS_SIFRE_BAYT = 72;

function sifreUzunlugunuDogrula(sifre: string): string | null {
  if (sifre.length === 0) return 'Şifre gerekli.';
  if (sifre.length < MIN_SIFRE_KARAKTER) return 'Şifre en az 8 karakter olmalı.';
  if (new TextEncoder().encode(sifre).length > MAKS_SIFRE_BAYT) return 'Şifre en fazla 72 bayt olabilir.';
  return null;
}

/**
 * web/src/pages/ProfilePage.tsx ile ayni (issue #119, kullanici karariyla sadelestirildi). #283'ten beri
 * sekme degil, profil basligindaki Hesap ayarlari dugmesinin actigi ekran.
 */
export default function AccountScreen() {
  const { t } = useTranslation();
  usePageTitle(t('ortak.hesapAyarlari'));
  const { username, updateProfile, logout } = useAuth();

  return (
    <EkranKaydirici contentContainerClassName="gap-6 px-4 pt-2 pb-4">
      <View className="flex-col gap-1 rounded-xl bg-surface-1 p-4">
        <Text className="text-label text-muted">Kullanıcı adı</Text>
        <Text className="text-body text-fg">{username}</Text>
      </View>
      <SifreFormu updateProfile={updateProfile} />
      <View className="flex-col gap-3 rounded-xl bg-surface-1 p-4">
        <Text className="text-heading text-fg">Antrenman hedefi</Text>
        <HaftalikHedefSecici />
      </View>
      <View className="flex-col gap-3 rounded-xl bg-surface-1 p-4">
        <GizlilikSeviyesiSecici />
      </View>
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

interface AltFormProps {
  updateProfile: (mevcutSifre: string, yeniKullaniciAdi?: string, yeniSifre?: string) => Promise<void>;
}

function SifreFormu({ updateProfile }: AltFormProps) {
  const [mevcutSifre, setMevcutSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrari, setYeniSifreTekrari] = useState('');
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  function dogrula(): boolean {
    const hatalar: Record<string, string> = {};
    if (mevcutSifre.length === 0) {
      hatalar.currentpassword = 'Mevcut şifre gerekli.';
    }
    const yeniSifreHatasi = sifreUzunlugunuDogrula(yeniSifre);
    if (yeniSifreHatasi) {
      hatalar.newpassword = yeniSifreHatasi;
    }
    if (!hatalar.newpassword && yeniSifreTekrari !== yeniSifre) {
      hatalar.newpasswordconfirm = 'Şifreler eşleşmiyor.';
    }
    setAlanHatalari(hatalar);
    return Object.keys(hatalar).length === 0;
  }

  async function gonder() {
    setGenelHata(null);
    setBasarili(false);
    if (!dogrula()) {
      return;
    }
    setGonderiliyor(true);
    try {
      await updateProfile(mevcutSifre, undefined, yeniSifre);
      setMevcutSifre('');
      setYeniSifre('');
      setYeniSifreTekrari('');
      setBasarili(true);
    } catch (hata) {
      const sonuc = apiHatasiniAyir(hata, ['currentpassword', 'newpassword'], (apiHatasi) =>
        apiHatasi.status === 401 ? 'Mevcut şifre yanlış.' : null,
      );
      setGenelHata(sonuc.genelHata);
      setAlanHatalari(sonuc.alanHatalari);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <View className="flex-col gap-3 rounded-xl bg-surface-1 p-4">
      <Text className="text-heading text-fg">Şifre değiştir</Text>
      {genelHata && <HataKutusu baslik="Güncellenemedi" mesaj={genelHata} />}
      {basarili && (
        <Text accessibilityRole="text" className="text-label text-accent-soft">
          Şifren güncellendi.
        </Text>
      )}
      <View className="flex-col gap-4">
        <SifreAlani
          id="profil-mevcut-sifre"
          etiket="Mevcut şifre"
          autoComplete="current-password"
          value={mevcutSifre}
          onChangeText={setMevcutSifre}
          hata={alanHatalari.currentpassword}
        />
        <SifreAlani
          id="profil-yeni-sifre"
          etiket="Yeni şifre"
          autoComplete="new-password"
          ipucu="En az 8 karakter"
          value={yeniSifre}
          onChangeText={setYeniSifre}
          hata={alanHatalari.newpassword}
        />
        <SifreAlani
          id="profil-yeni-sifre-tekrar"
          etiket="Yeni şifre tekrarı"
          gosterEtiketi="Yeni şifre tekrarını göster"
          autoComplete="new-password"
          value={yeniSifreTekrari}
          onChangeText={setYeniSifreTekrari}
          hata={alanHatalari.newpasswordconfirm}
        />
        <BirincilDugme yukseklik="normal" disabled={gonderiliyor} onPress={gonder}>
          Kaydet
        </BirincilDugme>
      </View>
    </View>
  );
}
