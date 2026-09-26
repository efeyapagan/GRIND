import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { AtSign, LogOut } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../src/auth/AuthContext';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { ApiError } from '@grind/shared/api/problem';
import { usePageTitle } from '@grind/shared/pageTitle';
import Alan from '../../../src/ui/Alan';
import SifreAlani from '../../../src/ui/SifreAlani';
import HataKutusu from '../../../src/ui/HataKutusu';
import BirincilDugme from '../../../src/ui/BirincilDugme';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';
import HaftalikHedefSatiri from '../../../src/components/HaftalikHedefSatiri';
import GizlilikSeviyesiSecici from '../../../src/components/GizlilikSeviyesiSecici';
import { ikonRenk } from '../../../src/ui/renkler';

const MIN_SIFRE_KARAKTER = 8;
const MAKS_SIFRE_BAYT = 72;
/** Sunucunun UpdateProfileRequest.NewUsername regex'iyle AYNI; biri degisirse digeri de degismeli. */
const KULLANICI_ADI_KURALI = /^[a-zA-Z0-9_-]{3,50}$/;

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
      <KullaniciAdiFormu mevcutAd={username ?? ''} updateProfile={updateProfile} />
      <SifreFormu updateProfile={updateProfile} />
      <View className="flex-col gap-3 rounded-xl bg-surface-1 p-4">
        <Text className="text-heading text-fg">Antrenman hedefi</Text>
        <HaftalikHedefSatiri />
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

/**
 * Kullanıcı adı değiştirme (#342). Uç zaten vardı (`PATCH /api/auth/me`, #65) ama arayüzü yoktu —
 * ad burada salt-okunur bir kart olarak duruyordu (#119'da sadeleştirilirken form kaldırılmıştı).
 *
 * Mevcut şifre İSTENİR: ucun kararı (UpdateProfileRequest, Karar 3) — kullanıcı adı da hassas bir
 * hesap işlemi, şifre değişikliğiyle aynı davranışı taşır.
 *
 * Çakışma kontrolü sunucudadır (409, büyük/küçük harf duyarsız normalleştirmeden SONRA); istemci
 * ikinci bir kontrol yapmaz (ikinci doğruluk kaynağı olurdu ve yarış koşuluna açıktır), yalnızca
 * 409'u alanın altına çevirir. Biçim kuralı ise burada da uygulanır: sunucunun regex'iyle aynı —
 * yoksa kullanıcı şifresini boş yere yazıp 400 yer.
 */
function KullaniciAdiFormu({ mevcutAd, updateProfile }: AltFormProps & { mevcutAd: string }) {
  const { t } = useTranslation();
  const [yeniAd, setYeniAd] = useState(mevcutAd);
  const [mevcutSifre, setMevcutSifre] = useState('');
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  function dogrula(): boolean {
    const hatalar: Record<string, string> = {};
    if (!KULLANICI_ADI_KURALI.test(yeniAd)) {
      hatalar.newusername = t('profil.kullaniciAdiKurali');
    } else if (yeniAd.toLowerCase() === mevcutAd.toLowerCase()) {
      // Degismeyen ad icin sifre sorup 200 donmek anlamsiz. Karsilastirma buyuk/kucuk harf
      // duyarsiz: sunucu adi normallestirdigi icin "Ada" ile "ada" AYNI addir.
      hatalar.newusername = t('profil.kullaniciAdiDegismedi');
    }
    if (mevcutSifre.length === 0) {
      hatalar.currentpassword = t('profil.mevcutSifreGerekli');
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
      await updateProfile(mevcutSifre, yeniAd);
      setMevcutSifre('');
      setBasarili(true);
    } catch (hata) {
      // 409'un sunucu metni ('efe' kullanıcı adı zaten alınmış) kullanıcının YAZDIGI adi geri
      // okutur; alanin altinda tek satirlik sabit metin daha okunakli.
      if (hata instanceof ApiError && hata.status === 409) {
        setAlanHatalari({ newusername: t('profil.kullaniciAdiAlinmis') });
        return;
      }
      const sonuc = apiHatasiniAyir(hata, ['newusername', 'currentpassword'], (apiHatasi) =>
        apiHatasi.status === 401 ? t('profil.mevcutSifreYanlis') : null,
      );
      setGenelHata(sonuc.genelHata);
      setAlanHatalari(sonuc.alanHatalari);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <View className="flex-col gap-3 rounded-xl bg-surface-1 p-4">
      <Text className="text-heading text-fg">{t('profil.kullaniciAdiDegistir')}</Text>
      {genelHata && <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={genelHata} />}
      {basarili && (
        <Text accessibilityRole="text" className="text-label text-accent-soft">
          {t('profil.kullaniciAdinGuncellendi')}
        </Text>
      )}
      <View className="flex-col gap-4">
        <Alan
          id="profil-yeni-kullanici-adi"
          etiket={t('profil.yeniKullaniciAdi')}
          ikon={AtSign}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          value={yeniAd}
          onChangeText={setYeniAd}
          hata={alanHatalari.newusername}
        />
        <SifreAlani
          id="profil-ad-mevcut-sifre"
          etiket={t('profil.mevcutSifre')}
          autoComplete="current-password"
          value={mevcutSifre}
          onChangeText={setMevcutSifre}
          hata={alanHatalari.currentpassword}
        />
        <BirincilDugme yukseklik="normal" disabled={gonderiliyor} onPress={gonder}>
          {t('profil.kullaniciAdiniKaydet')}
        </BirincilDugme>
      </View>
    </View>
  );
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
