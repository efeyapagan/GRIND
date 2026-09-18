import { NavLink, Outlet } from 'react-router-dom';
import { Home, Plus, User } from 'lucide-react';
import HesapMenusu from './ui/HesapMenusu';
import { PageTitleProvider, useHeaderTitle } from './ui/PageTitleContext';

/**
 * Korumali alanin ortak kabugu (spec Karar 8, issue #65 ile yeniden duzenlendi, #119/#120 ile
 * yeniden duzenlendi): ustte sol tarafta o an hangi ekrandaysak onun basligi, sag tarafta GRIND
 * kucuk yazisi + hesap menusu; altta sekme cubugu, aradaki icerik `Outlet`ten gelir. `NavLink`
 * aktif baglantiya `aria-current="page"`yi KENDISI koyar. Cikis hesap menusunde; cikistan sonra
 * `ProtectedRoute` zaten `/login`e yonlendirir.
 *
 * Alt menu (issue #119/#120): Ana Sayfa · (+) · Profil -- simetrik 1-1, ortada tasan buyuk bir "+"
 * dugmesi. Gecmis ve Rekorlar Profil'in sekmelerine tasindi (bkz. ProfileLayout). "+" HER ZAMAN
 * `/antrenman`a gider; acik bir antrenman varsa o sayfa (AntrenmanPage) zaten devam eden antrenmani
 * gosterir -- dugmenin kendisi bir durum kontrolu YAPMAZ (DRY, tek karar noktasi).
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
        <ul className="mx-auto flex h-16 max-w-md items-center px-4">
          <li className="flex flex-1 justify-center">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex h-12 min-w-16 flex-col items-center justify-center gap-1 ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              <Home aria-hidden size={22} />
              <span className="text-label-xs uppercase">Ana sayfa</span>
            </NavLink>
          </li>

          {/* Birincil eylem dugmesi (spec Karar 2 -- accent kullanim kurali "birincil dugme
              dolgusu" kategorisine girer, "Set ekle"/"Giris yap" ile ayni). Menu cubugunun ustune
              tasar (`-mt-7`); SADECE ikon -- gorunur etiket yok, erisilebilir ad `aria-label`den. */}
          <li className="flex flex-1 justify-center">
            <NavLink to="/antrenman" aria-label="Antrenman başlat" className="-mt-7 flex flex-col items-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg">
                <Plus aria-hidden size={28} />
              </span>
            </NavLink>
          </li>

          <li className="flex flex-1 justify-center">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex h-12 min-w-16 flex-col items-center justify-center gap-1 ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              <User aria-hidden size={22} />
              <span className="text-label-xs uppercase">Profil</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
}
