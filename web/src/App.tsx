import { NavLink, Outlet } from 'react-router-dom';
import { Calendar, History, Trophy, type LucideIcon } from 'lucide-react';
import HesapMenusu from './ui/HesapMenusu';
import { PageTitleProvider, useHeaderTitle } from './ui/PageTitleContext';

interface Sekme {
  to: string;
  etiket: string;
  ikon: LucideIcon;
  end?: boolean;
}

const SEKMELER: Sekme[] = [
  { to: '/', etiket: 'Bugün', ikon: Calendar, end: true },
  { to: '/history', etiket: 'Geçmiş', ikon: History },
  { to: '/records', etiket: 'Rekorlar', ikon: Trophy },
];

/**
 * Korumali alanin ortak kabugu (spec Karar 8, issue #65 ile yeniden duzenlendi): ustte sol tarafta
 * o an hangi ekrandaysak onun basligi, sag tarafta GRIND kucuk yazisi + hesap menusu; altta sekme
 * cubugu, aradaki icerik `Outlet`ten gelir. `NavLink` aktif baglantiya `aria-current="page"`yi
 * KENDISI koyar. Cikis hesap menusunde; cikistan sonra `ProtectedRoute` zaten `/login`e yonlendirir.
 *
 * Baslik `PageTitleProvider` icinden okunur (`useHeaderTitle`) -- her sayfa kendi basligini
 * `usePageTitle` ile bildirir, kendi govdesinde ayrica bir `<h1>` YAZMAZ (tek dogruluk kaynagi).
 *
 * `env(safe-area-inset-*)` hesaplari keyfi deger olarak yazilir: Tailwind'de guvenli alan tokeni
 * yok. 4rem = baslik ve sekme cubugu yuksekligi (h-16).
 */
export default function App() {
  return (
    <PageTitleProvider>
      <Kabuk />
    </PageTitleProvider>
  );
}

function Kabuk() {
  const baslik = useHeaderTitle();

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="fixed inset-x-0 top-0 z-40 bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <h1 className="truncate text-heading">{baslik}</h1>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-label text-muted uppercase">GRIND</span>
            <HesapMenusu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav
        aria-label="Ana gezinme"
        className="fixed inset-x-0 bottom-0 z-40 bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <ul className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
          {SEKMELER.map(({ to, etiket, ikon: Ikon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex h-12 min-w-16 flex-col items-center justify-center gap-1 ${
                    isActive ? 'text-accent' : 'text-muted'
                  }`
                }
              >
                <Ikon aria-hidden size={22} />
                <span className="text-label-xs uppercase">{etiket}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
