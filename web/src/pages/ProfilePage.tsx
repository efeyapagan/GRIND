import { useState, type FormEvent } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { usePageTitle } from '../ui/PageTitleContext';
import SifreAlani from '../ui/SifreAlani';
import HataKutusu from '../ui/HataKutusu';
import BirincilDugme from '../ui/BirincilDugme';
import HaftalikHedefSecici from '../components/HaftalikHedefSecici';
import GorunumSecici from '../components/GorunumSecici';

const MIN_SIFRE_KARAKTER = 8;
const MAKS_SIFRE_BAYT = 72;

function sifreUzunlugunuDogrula(sifre: string): string | null {
  if (sifre.length === 0) {
    return 'Şifre gerekli.';
  }
  if (sifre.length < MIN_SIFRE_KARAKTER) {
    return 'Şifre en az 8 karakter olmalı.';
  }
  if (new TextEncoder().encode(sifre).length > MAKS_SIFRE_BAYT) {
    // Bayt olarak olculur, karakter olarak degil (RegisterPage'deki ayni gerekce: 'ğ' gibi
    // coklu bayt karakterler BCrypt sinirini bayt cinsinden asabilir).
    return 'Şifre en fazla 72 bayt olabilir.';
  }
  return null;
}

/**
 * Hesap sekmesi (issue #119, kullanıcı kararıyla sadeleştirildi): kullanıcı adı artık
 * DÜZENLENEMEZ, sadece görüntülenir -- düzenlemeyi tamamen kaldırmak, "mevcut şifre" isteyen
 * hassas bir form + doğrulama akışını (issue #65'in orijinal tasarımı) ortadan kaldırdı. Şifre
 * değiştirme kalır. En altta "Çıkış yap" (eskiden üst kabuktaki hesap menüsündeydi -- menü
 * kaldırıldığı için tek mantıklı yeri burası).
 *
 * 401 (yanlis mevcut sifre) burada oturumu DUSURMEZ (`AuthContext.updateProfile` ->
 * `client.ts`'teki `sifreTeyidi401`) -- yanlizca sifre formunun hatasi olarak gosterilir.
 */
export default function ProfilePage() {
  usePageTitle('Hesap');
  const { username, updateProfile, logout } = useAuth();

  return (
    <div className="flex flex-col gap-6 pt-2 pb-4">
      <section className="flex flex-col gap-1 rounded-xl bg-surface-1 p-4">
        <span className="text-label text-muted">Kullanıcı adı</span>
        <span className="text-body">{username}</span>
      </section>
      <SifreFormu updateProfile={updateProfile} />
      {/* #117: haftalik hedef Bugun'den buraya tasindi. */}
      <section aria-labelledby="antrenman-hedefi-basligi" className="flex flex-col gap-3 rounded-xl bg-surface-1 p-4">
        <h2 id="antrenman-hedefi-basligi" className="text-heading">
          Antrenman hedefi
        </h2>
        <HaftalikHedefSecici />
      </section>
      {/* #178: tema tercihi cihazda saklanir, sunucuya gitmez. */}
      <section aria-labelledby="gorunum-basligi" className="flex flex-col gap-3 rounded-xl bg-surface-1 p-4">
        <h2 id="gorunum-basligi" className="text-heading">
          Görünüm
        </h2>
        <GorunumSecici />
      </section>
      <button
        type="button"
        onClick={logout}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface-1 p-4 text-label text-danger"
      >
        <LogOut aria-hidden size={18} />
        Çıkış yap
      </button>
    </div>
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

    // RegisterPage'deki ayni desen: sifrenin kendisi zaten hataliysa ikinci bir mesaj eklenmez.
    if (!hatalar.newpassword && yeniSifreTekrari !== yeniSifre) {
      hatalar.newpasswordconfirm = 'Şifreler eşleşmiyor.';
    }

    setAlanHatalari(hatalar);
    return Object.keys(hatalar).length === 0;
  }

  async function gonder(e: FormEvent) {
    e.preventDefault();
    setGenelHata(null);
    setBasarili(false);
    if (!dogrula()) {
      return;
    }

    setGonderiliyor(true);
    try {
      await updateProfile(mevcutSifre, undefined, yeniSifre);
      // Uc alan da GUVENLIK icin temizlenir -- basarili bir sifre degisikliginden sonra hicbir
      // sifre metni ekranda kalmamali.
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
    <section aria-labelledby="sifre-degistir-basligi" className="flex flex-col gap-3 rounded-xl bg-surface-1 p-4">
      <h2 id="sifre-degistir-basligi" className="text-heading">
        Şifre değiştir
      </h2>
      {genelHata && <HataKutusu baslik="Güncellenemedi" mesaj={genelHata} />}
      {basarili && (
        <p role="status" className="text-label text-accent-soft">
          Şifren güncellendi.
        </p>
      )}
      <form onSubmit={gonder} className="flex flex-col gap-4">
        <SifreAlani
          id="profil-mevcut-sifre"
          etiket="Mevcut şifre"
          autoComplete="current-password"
          value={mevcutSifre}
          onChange={(e) => setMevcutSifre(e.target.value)}
          hata={alanHatalari.currentpassword}
        />
        <SifreAlani
          id="profil-yeni-sifre"
          etiket="Yeni şifre"
          autoComplete="new-password"
          ipucu="En az 8 karakter"
          value={yeniSifre}
          onChange={(e) => setYeniSifre(e.target.value)}
          hata={alanHatalari.newpassword}
        />
        <SifreAlani
          id="profil-yeni-sifre-tekrar"
          etiket="Yeni şifre tekrarı"
          gosterEtiketi="Yeni şifre tekrarını göster"
          autoComplete="new-password"
          value={yeniSifreTekrari}
          onChange={(e) => setYeniSifreTekrari(e.target.value)}
          hata={alanHatalari.newpasswordconfirm}
        />
        <BirincilDugme type="submit" yukseklik="normal" disabled={gonderiliyor}>
          Kaydet
        </BirincilDugme>
      </form>
    </section>
  );
}
