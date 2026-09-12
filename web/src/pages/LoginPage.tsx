import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiHatasiniAyir } from '../lib/apiErrors';

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
    <main>
      <h1>Giriş Yap</h1>
      {genelHata && <p role="alert">{genelHata}</p>}
      <form onSubmit={gonder}>
        <div>
          <label htmlFor="username">Kullanıcı adı</label>
          <input
            id="username"
            value={kullaniciAdi}
            onChange={(e) => setKullaniciAdi(e.target.value)}
          />
          {alanHatalari.username && <p role="alert">{alanHatalari.username}</p>}
        </div>
        <div>
          <label htmlFor="password">Şifre</label>
          <input
            id="password"
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
          />
          {alanHatalari.password && <p role="alert">{alanHatalari.password}</p>}
        </div>
        <button type="submit" disabled={gonderiliyor}>
          Giriş Yap
        </button>
      </form>
      <p>
        Hesabın yok mu? <Link to="/register">Kayıt ol</Link>
      </p>
    </main>
  );
}
