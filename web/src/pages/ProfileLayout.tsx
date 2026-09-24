import { Link, Outlet } from 'react-router-dom';
import { History, Ruler, Search, Trophy } from 'lucide-react';
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

const DUGMELER = [
  { to: '/profile/edit', etiketAnahtari: 'ortak.profiliDuzenle' },
  { to: '/profile/account', etiketAnahtari: 'ortak.hesapAyarlari' },
] as const;

/**
 * Profil (#283): Instagram tarzı başlık, altında yalnızca ikonlu sekmeler. Sıra kullanıcı kararı:
 * Geçmiş (varsayılan, `routes.tsx`) · Rekorlar · Ölçüler. Hesap artık bir sekme değil -- başlıktaki
 * "Hesap ayarları" düğmesinin açtığı ayrı ekran. Başlık kendi verinle (#280) çizilir; ad, yaş ve
 * fotoğraf `useProfilim`'den gelir ki Profili düzenle'deki kayıt başlığa anında yansısın. #284: kullanıcı
 * aramasının giriş noktası kullanıcı adının yanındaki arama ikonu. Her sekme kendi `usePageTitle`'ını bildirir.
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
          adYani={
            <Link
              to="/search"
              aria-label={t('takip.kullaniciAra')}
              title={t('takip.kullaniciAra')}
              className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted"
            >
              <Search aria-hidden size={20} />
            </Link>
          }
        >
          {DUGMELER.map(({ to, etiketAnahtari }) => (
            <Link
              key={to}
              to={to}
              className="flex h-10 flex-1 items-center justify-center rounded-xl bg-surface-3 px-3 text-label text-fg"
            >
              {t(etiketAnahtari)}
            </Link>
          ))}
        </ProfilBasligi>
      )}
      <ProfilSekmeleri sekmeler={SEKMELER} />
      <Outlet />
    </div>
  );
}
