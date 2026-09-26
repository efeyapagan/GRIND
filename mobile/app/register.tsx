import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { AtSign, LockKeyhole, UserPlus } from 'lucide-react-native';
import { useAuth } from '../src/auth/AuthContext';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import AuthLayout from '../src/ui/AuthLayout';
import Alan from '../src/ui/Alan';
import SifreAlani from '../src/ui/SifreAlani';
import HataKutusu from '../src/ui/HataKutusu';
import BirincilDugme from '../src/ui/BirincilDugme';
import { useIkonRenk } from '../src/ui/renkler';

// Sunucudaki DataAnnotations kurallarinin AYNISI (Grind.Api RegisterRequest) -- web/src/pages/RegisterPage.tsx.
const KULLANICI_ADI_DESENI = /^[a-zA-Z0-9_-]{3,50}$/;
const MIN_SIFRE_KARAKTER = 8;
const MAKS_SIFRE_BAYT = 72;
const BILINEN_ALANLAR = ['username', 'password'];

export default function RegisterScreen() {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const { register } = useAuth();
  const router = useRouter();

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreTekrari, setSifreTekrari] = useState('');
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  function alanlariDogrula(): boolean {
    const hatalar: Record<string, string> = {};

    if (kullaniciAdi.length === 0) {
      hatalar.username = t('ortak.kullaniciAdiGerekli');
    } else if (!KULLANICI_ADI_DESENI.test(kullaniciAdi)) {
      hatalar.username = t('kayit.kullaniciAdiDeseni');
    }

    if (sifre.length === 0) {
      hatalar.password = t('ortak.sifreGerekli');
    } else if (sifre.length < MIN_SIFRE_KARAKTER) {
      hatalar.password = t('ortak.sifreEnAz8Karakter');
    } else if (new TextEncoder().encode(sifre).length > MAKS_SIFRE_BAYT) {
      hatalar.password = t('ortak.sifreEnFazla72Bayt');
    }

    if (!hatalar.password && sifreTekrari !== sifre) {
      hatalar.passwordConfirm = t('ortak.sifrelerEslesmiyor');
    }

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
      await register(kullaniciAdi, sifre);
      router.replace('/');
    } catch (hata) {
      const sonuc = apiHatasiniAyir(hata, BILINEN_ALANLAR);
      setGenelHata(sonuc.genelHata);
      setAlanHatalari(sonuc.alanHatalari);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <AuthLayout
      baslik={t('ortak.kayitOl')}
      aciklama={t('kayit.aciklama')}
      altBaglanti={
        <Text>
          {t('kayit.zatenHesabinVarMi')}{' '}
          <Link href="/login" className="font-semibold text-accent-soft">
            {t('ortak.girisYap')}
          </Link>
        </Text>
      }
    >
      {genelHata && <HataKutusu baslik={t('kayit.kayitBasarisiz')} mesaj={genelHata} />}
      <View className="flex flex-col gap-4">
        <Alan
          id="username"
          etiket={t('ortak.kullaniciAdi')}
          ikon={AtSign}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t('kayit.kullaniciAdiPlaceholder')}
          ipucu={t('kayit.kullaniciAdiIpucu')}
          value={kullaniciAdi}
          onChangeText={setKullaniciAdi}
          hata={alanHatalari.username}
        />
        <SifreAlani
          id="password"
          etiket={t('ortak.sifre')}
          autoComplete="new-password"
          ipucu={t('ortak.enAz8Karakter')}
          value={sifre}
          onChangeText={setSifre}
          hata={alanHatalari.password}
        />
        <SifreAlani
          id="password-confirm"
          etiket={t('kayit.sifreTekrari')}
          ikon={LockKeyhole}
          gosterEtiketi={t('kayit.sifreTekrariniGoster')}
          autoComplete="new-password"
          value={sifreTekrari}
          onChangeText={setSifreTekrari}
          hata={alanHatalari.passwordConfirm}
        />
        <BirincilDugme yukseklik="normal" disabled={gonderiliyor} onPress={gonder}>
          <UserPlus color={ikonRenk.onAccent} size={22} />
          <Text className="text-body-lg font-bold text-on-accent">{t('ortak.kayitOl')}</Text>
        </BirincilDugme>
      </View>
    </AuthLayout>
  );
}
