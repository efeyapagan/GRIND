import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiHatasiniAyir } from '../lib/apiErrors';

// Sunucudaki DataAnnotations kurallarının AYNISI (Grind.Api RegisterRequest) -- istemci
// tarafı yalnızca hızlı geri bildirim içindir, belirleyici olan her zaman sunucunun cevabıdır.
const KULLANICI_ADI_DESENI = /^[a-zA-Z0-9_-]{3,50}$/;
const MIN_SIFRE_KARAKTER = 8;
const MAKS_SIFRE_BAYT = 72;

export default function RegisterPage() {
  const { register } = useAuth();
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
    } else if (!KULLANICI_ADI_DESENI.test(kullaniciAdi)) {
      hatalar.username =
        'Kullanıcı adı 3-50 karakter olmalı; yalnızca İngilizce harf, rakam, _ ve - içerebilir.';
    }

    if (sifre.length === 0) {
      hatalar.password = 'Şifre gerekli.';
    } else if (sifre.length < MIN_SIFRE_KARAKTER) {
      hatalar.password = 'Şifre en az 8 karakter olmalı.';
    } else if (new TextEncoder().encode(sifre).length > MAKS_SIFRE_BAYT) {
      // Bayt olarak olculur, karakter olarak degil -- coklu bayt karakterler (orn. 'ğ')
      // karakter basina birden fazla bayt tutar, BCrypt sinirini bayt cinsinden asabilir.
      hatalar.password = 'Şifre en fazla 72 bayt olabilir.';
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
      const sonuc = apiHatasiniAyir(hata);
      setGenelHata(sonuc.genelHata);
      setAlanHatalari(sonuc.alanHatalari);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <main>
      <h1>Kayıt Ol</h1>
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
          Kayıt Ol
        </button>
      </form>
      <p>
        Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
      </p>
    </main>
  );
}
