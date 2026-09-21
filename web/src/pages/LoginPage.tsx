import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { apiHatasiniAyir } from '../lib/apiErrors';
import AuthLayout from '../ui/AuthLayout';
import Alan from '../ui/Alan';
import SifreAlani from '../ui/SifreAlani';
import HataKutusu from '../ui/HataKutusu';
import BirincilDugme from '../ui/BirincilDugme';

// `apiHatasiniAyir`e bu formun render ettigi alan adlarini bildiriyoruz (I3) -- yardimci bunu
// kendi basina bilemez, hicbir anahtar bu listeyle eslesmezse genel bir hataya duser.
const BILINEN_ALANLAR = ['username', 'password'];

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  // Login'in 401'i bilerek notr: kullanici adinin var olup olmadigini ya da hesabin
  // pasiflestirilmis olup olmadigini sizdirmaz (spec Karar 4) -- backend de ayni nedenle
  // uc durumu (yanlis sifre / bulunmayan kullanici / pasif hesap) tek bir 401'de birlestirir.
  const NOTR_GIRIS_HATASI = t('giris.hatasi');

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  function alanlariDogrula(): boolean {
    const hatalar: Record<string, string> = {};

    if (kullaniciAdi.length === 0) {
      hatalar.username = t('ortak.kullaniciAdiGerekli');
    }
    if (sifre.length === 0) {
      hatalar.password = t('ortak.sifreGerekli');
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
      await login(kullaniciAdi, sifre);
      navigate('/', { replace: true });
    } catch (hata) {
      // 401'de: alanlar BİLEREK temizlenmiyor -- kullanıcı sadece şifresini düzeltebilsin.
      const sonuc = apiHatasiniAyir(hata, BILINEN_ALANLAR, (apiHatasi) =>
        apiHatasi.status === 401 ? NOTR_GIRIS_HATASI : null,
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
        <>
          {t('giris.hesabinYokMu')}{' '}
          <Link to="/register" className="inline-flex min-h-11 items-center font-semibold text-accent-soft">
            {t('ortak.kayitOl')}
          </Link>
        </>
      }
    >
      {genelHata && <HataKutusu baslik={t('giris.girisBasarisiz')} mesaj={genelHata} />}
      <form onSubmit={gonder} className="flex flex-col gap-4">
        <Alan
          id="username"
          etiket={t('ortak.kullaniciAdi')}
          ikon={AtSign}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={kullaniciAdi}
          onChange={(e) => setKullaniciAdi(e.target.value)}
          hata={alanHatalari.username}
        />
        <SifreAlani
          id="password"
          etiket={t('ortak.sifre')}
          autoComplete="current-password"
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          hata={alanHatalari.password}
        />
        <BirincilDugme type="submit" yukseklik="normal" disabled={gonderiliyor}>
          {t('ortak.girisYap')}
        </BirincilDugme>
      </form>
    </AuthLayout>
  );
}
