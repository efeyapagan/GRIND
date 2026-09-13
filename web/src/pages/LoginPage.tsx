import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { apiHatasiniAyir } from '../lib/apiErrors';
import AuthLayout from '../ui/AuthLayout';
import Alan from '../ui/Alan';
import SifreAlani from '../ui/SifreAlani';
import HataKutusu from '../ui/HataKutusu';
import BirincilDugme from '../ui/BirincilDugme';

/**
 * Login'in 401'i bilerek nötr: kullanıcı adının var olup olmadığını ya da hesabın
 * pasifleştirilmiş olup olmadığını sızdırmaz (spec Karar 4) -- backend de aynı nedenle
 * üç durumu (yanlış şifre / bulunmayan kullanıcı / pasif hesap) tek bir 401'de birleştirir.
 */
const NOTR_GIRIS_HATASI = 'Kullanıcı adı veya şifre hatalı.';

// `apiHatasiniAyir`e bu formun render ettigi alan adlarini bildiriyoruz (I3) -- yardimci bunu
// kendi basina bilemez, hicbir anahtar bu listeyle eslesmezse genel bir hataya duser.
const BILINEN_ALANLAR = ['username', 'password'];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  function alanlariDogrula(): boolean {
    const hatalar: Record<string, string> = {};

    if (kullaniciAdi.length === 0) {
      hatalar.username = 'Kullanıcı adı gerekli.';
    }
    if (sifre.length === 0) {
      hatalar.password = 'Şifre gerekli.';
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
      baslik="Giriş yap"
      altBaglanti={
        <>
          Hesabın yok mu?{' '}
          <Link to="/register" className="inline-flex min-h-11 items-center font-semibold text-accent-soft">
            Kayıt ol
          </Link>
        </>
      }
    >
      {genelHata && <HataKutusu baslik="Giriş başarısız" mesaj={genelHata} />}
      <form onSubmit={gonder} className="flex flex-col gap-4">
        <Alan
          id="username"
          etiket="Kullanıcı adı"
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
          etiket="Şifre"
          autoComplete="current-password"
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          hata={alanHatalari.password}
        />
        <BirincilDugme type="submit" yukseklik="normal" disabled={gonderiliyor}>
          Giriş yap
        </BirincilDugme>
      </form>
    </AuthLayout>
  );
}
