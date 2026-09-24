import { Link, Outlet } from 'react-router-dom';
import { History, Pencil, Ruler, Search, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { useKullaniciProfili, useProfilim } from '../api/queries';
import HataKutusu from '../ui/HataKutusu';
import ProfilBasligi from '../components/ProfilBasligi';
import ProfilSekmeleri, { type ProfilSekmesi } from '../components/ProfilSekmeleri';

const SEKMELER: readonly ProfilSekmesi[] = [
  { to: 'history', etiketAnahtari: 'kabuk.sekmeGecmis', ikon: History },
  { to: 'records', etiketAnahtari: 'kabuk.sekmeRekorlar', ikon: Trophy },
  { to: 'measurements', etiketAnahtari: 'kabuk.sekmeOlcumler', ikon: Ruler },
];

/**
 * Profil (#283): Instagram tarzı başlık, altında yalnızca ikonlu sekmeler. Sıra kullanıcı kararı:
 * Geçmiş (varsayılan, `routes.tsx`) · Rekorlar · Ölçüler. Başlık kendi verinle (#280) çizilir; ad,
 * yaş ve fotoğraf `useProfilim`'den gelir ki Profili düzenle'deki kayıt başlığa anında yansısın.
 * #284: kullanıcı aramasının giriş noktası `@kullanıcı adı`nın yanındaki arama ikonu.
 *
 * #293: "Profili düzenle" ve "Hesap ayarları" düğmeleri kalktı -- düzenleme artık isim satırının
 * sonundaki kalem ikonu, hesap ayarları ust kabuktaki "GRIND" yazisinin yerini alan kisayol
 * (`App.tsx`, `profilAnaEkraniMi`). Bu yuzden `ProfilBasligi`'a `children` HIC verilmiyor -- kendi
 * profilinde en alttaki dugme satiri artik yok.
 */
export default function ProfileLayout() {
  const { t } = useTranslation();
  const { username } = useAuth();
  const profil = useProfilim();
  const sayaclar = useKullaniciProfili(username);

  return (
    <div className="flex flex-col gap-4">
      {profil.isError ? (
        <HataKutusu baslik={t('profil.guncellenemedi')} mesaj={t('profil.profilAlinamadi')} />
      ) : !profil.data ? (
        <div className="min-h-40" />
      ) : (
        <ProfilBasligi
          kisi={profil.data}
          sayaclar={sayaclar.data}
          duzenle={
            <Link
              to="/profile/edit"
              aria-label={t('ortak.profiliDuzenle')}
              title={t('ortak.profiliDuzenle')}
              className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted"
            >
              <Pencil aria-hidden size={16} />
            </Link>
          }
          adYani={
            <Link
              to="/search"
              aria-label={t('takip.kullaniciAra')}
              title={t('takip.kullaniciAra')}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted"
            >
              <Search aria-hidden size={18} />
            </Link>
          }
        />
      )}
      <ProfilSekmeleri sekmeler={SEKMELER} />
      <Outlet />
    </div>
  );
}
