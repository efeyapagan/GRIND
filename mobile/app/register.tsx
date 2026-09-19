import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AtSign, LockKeyhole, UserPlus } from 'lucide-react-native';
import { useAuth } from '../src/auth/AuthContext';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import AuthLayout from '../src/ui/AuthLayout';
import Alan from '../src/ui/Alan';
import SifreAlani from '../src/ui/SifreAlani';
import HataKutusu from '../src/ui/HataKutusu';
import BirincilDugme from '../src/ui/BirincilDugme';
import { ikonRenk } from '../src/ui/renkler';

// Sunucudaki DataAnnotations kurallarinin AYNISI (Grind.Api RegisterRequest) -- web/src/pages/RegisterPage.tsx.
const KULLANICI_ADI_DESENI = /^[a-zA-Z0-9_-]{3,50}$/;
const MIN_SIFRE_KARAKTER = 8;
const MAKS_SIFRE_BAYT = 72;
const BILINEN_ALANLAR = ['username', 'password'];

export default function RegisterScreen() {
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
      hatalar.username = 'Kullanıcı adı gerekli.';
    } else if (!KULLANICI_ADI_DESENI.test(kullaniciAdi)) {
      hatalar.username =
        'Kullanıcı adı 3-50 karakter olmalı; yalnızca İngilizce harf, rakam, _ ve - içerebilir.';
    }

    if (sifre.length === 0) {
      hatalar.password = 'Şifre gerekli.';
    } else if (sifre.length < MIN_SIFRE_KARAKTER) {
      hatalar.password = 'Şifre en az 8 karakter olmalı.';
    } else if (new TextEncoder().encode(sifre).length > MAKS_SIFRE_BAYT) {
      hatalar.password = 'Şifre en fazla 72 bayt olabilir.';
    }

    if (!hatalar.password && sifreTekrari !== sifre) {
      hatalar.passwordConfirm = 'Şifreler eşleşmiyor.';
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
      baslik="Kayıt ol"
      aciklama="Ağırlıklarını ve gelişimini anlık takip etmeye başla."
      altBaglanti={
        <Text>
          Zaten hesabın var mı?{' '}
          <Link href="/login" className="font-semibold text-accent-soft">
            Giriş yap
          </Link>
        </Text>
      }
    >
      {genelHata && <HataKutusu baslik="Kayıt başarısız" mesaj={genelHata} />}
      <View className="flex flex-col gap-4">
        <Alan
          id="username"
          etiket="Kullanıcı adı"
          ikon={AtSign}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ornek_kullanici"
          ipucu="3–50 karakter (harf, rakam, _ ve -)"
          value={kullaniciAdi}
          onChangeText={setKullaniciAdi}
          hata={alanHatalari.username}
        />
        <SifreAlani
          id="password"
          etiket="Şifre"
          autoComplete="new-password"
          ipucu="En az 8 karakter"
          value={sifre}
          onChangeText={setSifre}
          hata={alanHatalari.password}
        />
        <SifreAlani
          id="password-confirm"
          etiket="Şifre tekrarı"
          ikon={LockKeyhole}
          gosterEtiketi="Şifre tekrarını göster"
          autoComplete="new-password"
          value={sifreTekrari}
          onChangeText={setSifreTekrari}
          hata={alanHatalari.passwordConfirm}
        />
        <BirincilDugme yukseklik="normal" disabled={gonderiliyor} onPress={gonder}>
          <UserPlus color={ikonRenk.onAccent} size={22} />
          <Text className="text-body-lg font-bold text-on-accent">Kayıt ol</Text>
        </BirincilDugme>
      </View>
    </AuthLayout>
  );
}
