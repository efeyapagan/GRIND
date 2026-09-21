import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, LockKeyhole, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { apiHatasiniAyir } from '../lib/apiErrors';
import AuthLayout from '../ui/AuthLayout';
import Alan from '../ui/Alan';
import SifreAlani from '../ui/SifreAlani';
import HataKutusu from '../ui/HataKutusu';
import BirincilDugme from '../ui/BirincilDugme';

// Sunucudaki DataAnnotations kurallarının AYNISI (Grind.Api RegisterRequest) -- istemci
// tarafı yalnızca hızlı geri bildirim içindir, belirleyici olan her zaman sunucunun cevabıdır.
const KULLANICI_ADI_DESENI = /^[a-zA-Z0-9_-]{3,50}$/;
const MIN_SIFRE_KARAKTER = 8;
const MAKS_SIFRE_BAYT = 72;

// `apiHatasiniAyir`e bu formun render ettigi alan adlarini bildiriyoruz (I3) -- yardimci bunu
// kendi basina bilemez, hicbir anahtar bu listeyle eslesmezse genel bir hataya duser.
const BILINEN_ALANLAR = ['username', 'password'];

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

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
      // Bayt olarak olculur, karakter olarak degil -- coklu bayt karakterler (orn. 'ğ')
      // karakter basina birden fazla bayt tutar, BCrypt sinirini bayt cinsinden asabilir.
      hatalar.password = t('ortak.sifreEnFazla72Bayt');
    }

    // Spec davranis 1: sifre sifirlama olmadigi icin kayittaki yazim hatasi hesabi kalici kilitler.
    // Sifrenin kendisi zaten hataliysa ikinci bir mesaj eklenmez; sunucuya yalnizca `password` gider.
    if (!hatalar.password && sifreTekrari !== sifre) {
      hatalar.passwordConfirm = t('ortak.sifrelerEslesmiyor');
    }

    setAlanHatalari(hatalar);
    return Object.keys(hatalar).length === 0;
  }

  async function gonder(e: FormEvent) {
    e.preventDefault();
    setGenelHata(null);

    if (!alanlariDogrula()) {
      return;
    }

    setGonderiliyor(true);
    try {
      await register(kullaniciAdi, sifre);
      navigate('/', { replace: true });
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
        <>
          {t('kayit.zatenHesabinVarMi')}{' '}
          <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-accent-soft">
            {t('ortak.girisYap')}
          </Link>
        </>
      }
    >
      {genelHata && <HataKutusu baslik={t('kayit.kayitBasarisiz')} mesaj={genelHata} />}
      <form onSubmit={gonder} className="flex flex-col gap-4">
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
          onChange={(e) => setKullaniciAdi(e.target.value)}
          hata={alanHatalari.username}
        />
        <SifreAlani
          id="password"
          etiket={t('ortak.sifre')}
          autoComplete="new-password"
          ipucu={t('ortak.enAz8Karakter')}
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          hata={alanHatalari.password}
        />
        <SifreAlani
          id="password-confirm"
          etiket={t('kayit.sifreTekrari')}
          ikon={LockKeyhole}
          gosterEtiketi={t('kayit.sifreTekrariniGoster')}
          autoComplete="new-password"
          value={sifreTekrari}
          onChange={(e) => setSifreTekrari(e.target.value)}
          hata={alanHatalari.passwordConfirm}
        />
        <BirincilDugme type="submit" yukseklik="normal" disabled={gonderiliyor}>
          <UserPlus aria-hidden size={22} />
          {t('ortak.kayitOl')}
        </BirincilDugme>
      </form>
    </AuthLayout>
  );
}
