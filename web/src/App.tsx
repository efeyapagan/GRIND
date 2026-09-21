import { NavLink, Outlet } from 'react-router-dom';
import { Home, Plus, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageTitleProvider, useHeaderTitle } from './ui/PageTitleContext';
import TemaDugmesi from './components/TemaDugmesi';

/**
 * Korumali alanin ortak kabugu (spec Karar 8, issue #65 ile yeniden duzenlendi, #119/#120 ile
 * yeniden duzenlendi): ustte sol tarafta o an hangi ekrandaysak onun basligi, sag tarafta GRIND
 * kucuk yazisi; altta sekme cubugu, aradaki icerik `Outlet`ten gelir. `NavLink` aktif baglantiya
 * `aria-current="page"`yi KENDISI koyar.
 *
 * Hesap menusu KALDIRILDI (kullanici karari): Profil artik alt menude kendi sekmesi, "Cikis yap"
 * o sekmenin (Hesap) icinde en altta durur (bkz. ProfilePage) -- ust kabukta ayrica bir hesap
 * ikonuna/popover'a gerek kalmadi. Sag ustte "GRIND" yazisi ve hemen solunda tema dugmesi (#194).
 *
 * Alt menu (issue #119/#120): Ana Sayfa · (+) · Profil -- simetrik 1-1, ortada tasan buyuk bir "+"
 * dugmesi. UCU DE simgeden ibarettir, gorunur etiket YOK -- erisilebilir ad `aria-label`den gelir
 * (kullanici karari: sade, ikon-yalnizca bir cubuk). Gecmis ve Rekorlar Profil'in sekmelerine
 * tasindi (bkz. ProfileLayout). "+" HER ZAMAN `/antrenman`a gider; acik bir antrenman varsa o
 * sayfa (AntrenmanPage) zaten devam eden antrenmani gosterir -- dugmenin kendisi bir durum
 * kontrolu YAPMAZ (DRY, tek karar noktasi).
 *
 * Baslik `PageTitleProvider` icinden okunur (`useHeaderTitle`) -- her sayfa kendi basligini
 * `usePageTitle` ile bildirir, kendi govdesinde ayrica bir `<h1>` YAZMAZ (tek dogruluk kaynagi).
 *
 * `env(safe-area-inset-*)` hesaplari keyfi deger olarak yazilir: Tailwind'de guvenli alan tokeni
 * yok. Baslik icin 4rem (h-16) kullanilir; alt bosluk icin 5.5rem -- sekme cubugu artik h-14
 * (3.5rem) ama ortadaki "+" dugmesinin halkasi cubugun 2rem USTUNE tastigi icin (issue #159),
 * yalnizca 3.5rem yetmiyor (kullanici bulgusu: sayfa icerigi bu dugmeyle CAKISIYORDU).
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
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="fixed inset-x-0 top-0 z-40 bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <h1 className="truncate text-heading">{baslik}</h1>
          {/* #194: tema dugmesi GRIND'in hemen solunda (Profil > Hesap'tan buraya tasindi). */}
          <div className="flex shrink-0 items-center gap-3">
            <TemaDugmesi />
            <span className="text-label text-muted uppercase">GRIND</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      {/* Gorsel (issue #159, kullanici referansi): cubuk `surface-1` -- sayfanin `bg` renginden
          bir ton acik -- boylece "+" dugmesinin etrafina sarilan `bg` renkli halka (`p-1`)
          cubuktan GORUNUR bir seritle ayrilir, duz bir cubugun onune cikan yalin bir daireden
          daha estetik durur. `nav` seffaf kalir (halka tasmasi kok `bg` ile kaynassin diye),
          renk yalnizca `ul` cubugunda. Cubuk h-14'e indirilip yan dugmeler h-11'e kuculdu. */}
      <nav
        aria-label={t('kabuk.gezinme')}
        className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex h-14 max-w-md items-center bg-surface-1/90 px-4 backdrop-blur-xl">
          <li className="flex flex-1 justify-center">
            <NavLink
              to="/"
              end
              aria-label={t('kabuk.anaSayfa')}
              className={({ isActive }) =>
                `flex h-11 min-w-16 items-center justify-center ${isActive ? 'text-accent-fg' : 'text-muted'}`
              }
            >
              <Home aria-hidden size={22} />
            </NavLink>
          </li>

          {/* Birincil eylem dugmesi (spec Karar 2 -- accent kullanim kurali "birincil dugme
              dolgusu" kategorisine girer, "Set ekle"/"Giris yap" ile ayni). Halka (`bg` renkli,
              `p-1`) cubuktan bir seritle ayirir; `-mt-6` mobildeki (`KabukTabBar`) ayni degerle
              birebir eslesir. */}
          <li className="flex flex-1 justify-center">
            <NavLink to="/antrenman" aria-label={t('kabuk.antrenmanBaslat')} className="flex items-center">
              <span className="-mt-6 flex items-center justify-center rounded-full bg-bg p-1">
                <span className="flex size-16 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg">
                  <Plus aria-hidden size={28} />
                </span>
              </span>
            </NavLink>
          </li>

          <li className="flex flex-1 justify-center">
            <NavLink
              to="/profile"
              aria-label={t('kabuk.profil')}
              className={({ isActive }) =>
                `flex h-11 min-w-16 items-center justify-center ${isActive ? 'text-accent-fg' : 'text-muted'}`
              }
            >
              <User aria-hidden size={22} />
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
}
