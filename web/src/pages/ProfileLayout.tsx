import { NavLink, Outlet } from 'react-router-dom';
import { History, Ruler, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Parilti from '../ui/Parilti';
import ProfilBasligi from '../components/ProfilBasligi';

const SEKMELER = [
  { to: 'history', etiketAnahtari: 'kabuk.sekmeGecmis', ikon: History },
  { to: 'records', etiketAnahtari: 'kabuk.sekmeRekorlar', ikon: Trophy },
  { to: 'measurements', etiketAnahtari: 'kabuk.sekmeOlcumler', ikon: Ruler },
] as const;

/**
 * Profil (#283): Instagram tarzı başlık, altında yalnızca ikonlu sekmeler (etiket `aria-label`'da).
 * Sıra kullanıcı kararı: Geçmiş (varsayılan, `routes.tsx`) · Rekorlar · Ölçüler. Hesap artık bir
 * sekme değil -- başlıktaki "Hesap ayarları" düğmesinin açtığı ayrı ekran.
 * Her sekme kendi `usePageTitle`'ını bildirir. Rota-tabanlı olduğu için ARIA `tab`/`tablist` rolü
 * BİLEREK kullanılmaz (her sekme gerçek bir URL'e sahip ayrı bir sayfadır) -- alt menüyle
 * (`App.tsx`) aynı düz `nav` deseni.
 */
export default function ProfileLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <ProfilBasligi />
      <nav aria-label={t('kabuk.profilSekmeleri')} className="flex border-b border-surface-3">
        {SEKMELER.map(({ to, etiketAnahtari, ikon: Ikon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={t(etiketAnahtari)}
            title={t(etiketAnahtari)}
            className={({ isActive }) =>
              `relative flex min-h-11 flex-1 items-center justify-center border-b-2 px-2 ${
                isActive ? 'border-accent-fg text-fg' : 'border-transparent text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <Parilti bicim="alt" />}
                <Ikon aria-hidden size={22} className="relative" />
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
