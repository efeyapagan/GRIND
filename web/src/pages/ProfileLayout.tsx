import { NavLink, Outlet } from 'react-router-dom';

const SEKMELER = [
  { to: 'account', etiket: 'Hesap' },
  { to: 'measurements', etiket: 'Ölçüler' },
  { to: 'history', etiket: 'Geçmiş' },
  { to: 'records', etiket: 'Rekorlar' },
];

/**
 * Profil sayfasının sekme çubuğu (issue #119): Hesap (kullanıcı adı/şifre), Ölçüler (yeni),
 * Geçmiş ve Rekorlar (alt menüden buraya taşındı, issue #120) rota-tabanlı sekmelerdir -- her
 * biri kendi `usePageTitle`'ını bildirir, burada ayrıca bir başlık YAZILMAZ. Rota-tabanlı
 * olduğu için ARIA `tab`/`tablist` rolü BİLEREK kullanılmaz (o rol tek sayfalık bir panel
 * değişimini ifade eder; burada her sekme gerçek bir URL'e sahip ayrı bir sayfadır) -- alt
 * menünün kendisiyle (`App.tsx`) aynı düz `nav` deseni.
 */
export default function ProfileLayout() {
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Profil sekmeleri" className="flex border-b border-surface-3">
        {SEKMELER.map(({ to, etiket }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-11 flex-1 items-center justify-center border-b-2 px-2 text-center text-label ${
                isActive ? 'border-accent text-fg' : 'border-transparent text-muted'
              }`
            }
          >
            {etiket}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
