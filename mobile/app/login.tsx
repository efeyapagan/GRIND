import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { AtSign } from 'lucide-react-native';
import { useAuth } from '../src/auth/AuthContext';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import AuthLayout from '../src/ui/AuthLayout';
import Alan from '../src/ui/Alan';
import SifreAlani from '../src/ui/SifreAlani';
import HataKutusu from '../src/ui/HataKutusu';
import BirincilDugme from '../src/ui/BirincilDugme';

const BILINEN_ALANLAR = ['username', 'password'];

export default function LoginScreen() {
  const { t } = useTranslation();
  /** web/src/pages/LoginPage.tsx ile ayni sozlesme -- login'in 401'i bilerek notr (spec Karar 4). */
  const notrGirisHatasi = t('giris.hatasi');
  const { login } = useAuth();
  const router = useRouter();

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  function alanlariDogrula(): boolean {
    const hatalar: Record<string, string> = {};
    if (kullaniciAdi.length === 0) hatalar.username = t('ortak.kullaniciAdiGerekli');
    if (sifre.length === 0) hatalar.password = t('ortak.sifreGerekli');
    setAlanHatalari(hatalar);
    return Object.keys(hatalar).length === 0;
  }

  async function gonder() {
    setGenelHata(null);
    if (!alanlariDogrula()) {
      return;
    }
    setGonderiliyor(true);
    try {
      await login(kullaniciAdi, sifre);
      router.replace('/');
    } catch (hata) {
      const sonuc = apiHatasiniAyir(hata, BILINEN_ALANLAR, (apiHatasi) =>
        apiHatasi.status === 401 ? notrGirisHatasi : null,
      );
      setGenelHata(sonuc.genelHata);
      setAlanHatalari(sonuc.alanHatalari);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <AuthLayout
      baslik={t('ortak.girisYap')}
      altBaglanti={
        <Text>
          {t('giris.hesabinYokMu')}{' '}
          <Link href="/register" className="font-semibold text-accent-soft">
            {t('ortak.kayitOl')}
          </Link>
        </Text>
      }
    >
      {genelHata && <HataKutusu baslik={t('giris.girisBasarisiz')} mesaj={genelHata} />}
      <View className="flex flex-col gap-4">
        <Alan
          id="username"
          etiket={t('ortak.kullaniciAdi')}
          ikon={AtSign}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={kullaniciAdi}
          onChangeText={setKullaniciAdi}
          hata={alanHatalari.username}
        />
        <SifreAlani
          id="password"
          etiket={t('ortak.sifre')}
          autoComplete="current-password"
          value={sifre}
          onChangeText={setSifre}
          hata={alanHatalari.password}
        />
        <BirincilDugme testID="giris-yap-buton" yukseklik="normal" disabled={gonderiliyor} onPress={gonder}>
          {t('ortak.girisYap')}
        </BirincilDugme>
      </View>
    </AuthLayout>
  );
}
