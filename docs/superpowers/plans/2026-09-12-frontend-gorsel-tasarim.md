# Frontend Görsel Tasarım Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dilim 1'in altı ekranına Stitch'te onaylanan görsel tasarımı Tailwind v4 ile uygulamak;
davranışı ve 65 mevcut testi korurken spec'teki altı küçük davranış ekini eklemek.

**Architecture:** Önce temel (Tailwind, tokenlar, font, temel stiller). Sonra kabuk (üst başlık +
hesap menüsü + alt sekme çubuğu). Ardından ekranlar: Bugün (dilimin kalbi), Geçmiş + Rekorlar,
Giriş + Kayıt. Tekrarlanan görsel parçalar `web/src/ui/` altında küçük bileşenlere çıkarılır; her
bileşeni ilk ihtiyaç duyan görev oluşturur, sonrakiler yeniden kullanır. En son PWA ikonları.
Görsel doğrulama (ekran görüntüsü karşılaştırması) kontrolcü görevidir.

**Tech Stack:** Tailwind CSS 4.3 (`@tailwindcss/vite`), `@fontsource-variable/inter` 5.3,
`lucide-react` 1.45, `@vite-pwa/assets-generator` 1.0 (`vite-plugin-pwa` 1.3'ün peer aralığı; spec
Karar 6); mevcut React 19 + Vite 8 + Vitest + RTL + MSW.

**Spec:** `docs/superpowers/specs/2026-09-12-frontend-gorsel-tasarim-design.md` (bağlayıcı).
Görsel referans: `docs/design/stitch/*.html`. Mimari spec
(`docs/superpowers/specs/2026-09-12-frontend-react-pwa-design.md`) geçerliliğini korur.

---

## Global Constraints

Her görevin gereksinimleri bu bölümü örtük olarak içerir.

- **Stil yalnızca Tailwind yardımcı sınıfları + `@theme` tokenlarıyla.** Satır içi `style=` YOK. UI
  kütüphanesi YOK. Keyfi değer (`bg-[#…]`, `h-[52px]`) yalnızca token karşılığı olmayan tek seferlik
  ölçü için ve yanında gerekçe yorumuyla. `@apply` YOK — tekrarlanan sınıf kümesi bir React
  bileşenine çıkar.
- **Renkler yalnızca spec Karar 2'deki tokenlar:** `bg`, `inset`, `surface-1..4`, `fg`, `muted`,
  `accent`, `on-accent`, `accent-soft`, `danger`, `danger-bg`, `on-danger-bg`. Tailwind'in hazır renk
  paleti (`bg-gray-800`, `text-orange-500`…) KULLANILMAZ.
- **`accent` yalnızca:** birincil düğme dolgusu, rekor rozeti dolgusu, rekor kartı noktası, aktif
  sekme, marka işareti (logo dambılı). **`accent-soft` yalnızca metin/ikon**, asla dolgu. `accent`
  dolgu üstündeki metin her zaman `on-accent`.
- **Görünen BÜYÜK HARF yalnızca CSS ile (`uppercase` sınıfı).** Kaynak metin normal yazılır
  ("Ağırlık rekoru", "Bugün") — erişilebilir adlar ve testler buna dayanır.
- **Erişilebilirlik:** `focus:outline-none` YOK (odak halkası `index.css`'teki `:focus-visible`
  kuralından gelir); viewport'a `maximum-scale`/`user-scalable` EKLENMEZ; her girdinin ilişkili
  `<label>`'ı olur (görünmesi gerekmiyorsa `sr-only`); süs ikonları `aria-hidden`; yalnızca ikondan
  oluşan düğme `aria-label` taşır; hata `role="alert"`; hiçbir işlev hover'a bağlı değil; dokunma
  hedefi ≥ 44×44 px.
- **Hareket:** tek animasyon "Devam ediyor" noktası, `motion-safe:animate-pulse`. `active:scale`,
  `transition-transform` süsleri YOK.
- **Davranış korunur:** API katmanı, sorgular, önbellek anahtarları, doğrulama kuralları, hata
  ayrıştırma, TR saat biçimleme değişmez. Sunucu değerleri istemcide yeniden hesaplanmaz. Liste
  sunumu (grup numarası, "N SET" satır sayısı) serbesttir.
- **Backend'e DOKUNULMAZ.** `web/` dışında yalnızca plan açıkça söylüyorsa değişiklik.
- **Testler davranış sınar:** rol/etiket/metin ile sorgulanır, sınıf adı ya da renk sınanmaz (Vitest
  `css: false`). Metni değişen yerde test aynı davranışı yeni metinle sınayacak şekilde güncellenir;
  test SİLİNMEZ ve zayıflatılmaz.
- **Metinler Türkçe**, test adları Türkçe (ASCII), kod yorumları Türkçe.
- **Doğrulama komutları** (hepsi `web/` içinde): `npm run typecheck` (= `tsc -b`), `npm run test`,
  `npm run build`. Görev bittiğinde üçü de yeşil.
- **Commit mesajları** Türkçe, ASCII karakterlerle, `feat(web)`/`test(web)`/`chore(web)`/`style(web)`
  önekli, şu satırla biter: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

## Dosya Haritası

İkon sarmalayıcısı yok: ikonlar doğrudan `lucide-react`'tan içe aktarılır.

**Yeni:**
- `web/src/ui/BirincilDugme.tsx` — accent dolgulu birincil düğme (Görev 3; Görev 5 kullanır)
- `web/src/ui/Rozet.tsx` — rekor rozeti ve açık rozet (Görev 3; Görev 4 kullanır)
- `web/src/ui/Hap.tsx` — küçük bilgi hapı: RIR, "N SET", "Devam ediyor" (Görev 3; Görev 4 kullanır)
- `web/src/ui/BosDurum.tsx` — ikon + başlık + açıklama (Görev 3; Görev 4 kullanır)
- `web/src/ui/HesapMenusu.tsx` — Popover API ile hesap menüsü (Görev 2)
- `web/src/ui/AuthLayout.tsx`, `web/src/ui/Alan.tsx`, `web/src/ui/SifreAlani.tsx`,
  `web/src/ui/HataKutusu.tsx` (Görev 5)
- `web/src/ui/SifreAlani.test.tsx` (Görev 5)
- `web/src/test/metin.ts` — `tamMetin()` test yardımcısı (Görev 3)
- `web/pwa-assets.config.ts`, `web/public/icon.svg`, üretilen PNG/ICO dosyaları (Görev 6)

**Değişen:** `web/package.json`, `web/package-lock.json`, `web/vite.config.ts`, `web/index.html`,
`web/src/index.css` (Görev 1); `web/src/App.tsx`, `web/src/App.test.tsx` (Görev 2);
`web/src/pages/TodayPage.tsx`, `web/src/components/AddSetForm.tsx`, `web/src/components/SetList.tsx`,
`web/src/pages/TodayPage.test.tsx` (Görev 3); `web/src/pages/HistoryPage.tsx`,
`web/src/pages/RecordsPage.tsx` ve testleri (Görev 4); `web/src/pages/LoginPage.tsx`,
`web/src/pages/RegisterPage.tsx` ve testleri (Görev 5).

---

### Task 1: Tailwind, tokenlar, font ve temel stiller

**Files:**
- Modify: `web/package.json`, `web/package-lock.json` (npm ile)
- Modify: `web/vite.config.ts`, `web/index.html`, `web/src/index.css`

**Interfaces:**
- Consumes: yok.
- Produces: `@theme` tokenları → Tailwind sınıfları: renk `bg-bg`, `bg-inset`, `bg-surface-1`…`-4`,
  `text-fg`, `text-muted`, `bg-accent`, `text-on-accent`, `text-accent-soft`, `text-danger`,
  `bg-danger-bg`, `text-on-danger-bg` (ve `bg-accent/20` gibi opaklık biçimleri); yazı `text-title`,
  `text-heading`, `text-metric`, `text-body-lg`, `text-body`, `text-label`, `text-label-xs`;
  font `font-sans` = Inter Variable. `lucide-react` kurulu.

Bu görev yapılandırmadır: davranış testi yazılmaz. Kanıt, mevcut 65 testin yeşil kalması ve
derleme çıktısındaki kontrollerdir.

- [ ] **Step 1: Paketleri kur**

```bash
cd web
npm install lucide-react @fontsource-variable/inter
npm install -D tailwindcss @tailwindcss/vite @vite-pwa/assets-generator
```

`@vite-pwa/assets-generator` Görev 6'da kullanılır; `sharp` gibi yerel bir bağımlılık çeker, kurulum
hatası verirse DUR ve raporla.

- [ ] **Step 2: `vite.config.ts` — Tailwind eklentisi, tema rengi, font precache**

`import tailwindcss from '@tailwindcss/vite';` ekle; `plugins` dizisi `[react(), tailwindcss(),
VitePWA({...})]` olsun. `VitePWA` içinde `manifest`'e iki alan ekle ve `workbox`'a `globPatterns`
ekle; mevcut yorumu güncelle:

```ts
    VitePWA({
      registerType: 'autoUpdate',
      // Ikonlar Gorev 6'da eklenir. Tema rengi gorsel tasarim spec'i Karar 5.
      manifest: {
        name: 'GRIND',
        short_name: 'GRIND',
        start_url: '/',
        display: 'standalone',
        lang: 'tr',
        theme_color: '#121316',
        background_color: '#121316',
      },
      workbox: {
        // Uygulama kabugu onbellekten acilir. API yanitlari onbelleklenmez: bayat antrenman
        // verisi gostermek, veri gostermemekten daha kotu (mimari spec R14).
        navigateFallbackDenylist: [/^\/api\//],
        // Font kabuk varligidir, veri degil: yalnizca Turkce icin gereken iki alt kume precache'e
        // girer (gorsel tasarim spec'i Karar 3).
        globPatterns: [
          '**/*.{js,css,html}',
          '**/inter-latin-wght-normal-*.woff2',
          '**/inter-latin-ext-wght-normal-*.woff2',
        ],
      },
    }),
```

- [ ] **Step 3: `index.html` — tema rengi**

`<meta name="viewport" …>` satırının ALTINA ekle (viewport satırına DOKUNMA):

```html
    <meta name="theme-color" content="#121316" />
```

- [ ] **Step 4: `src/index.css` — tamamen şununla değiştir**

```css
@import 'tailwindcss';

/*
 * Inter yalnizca latin + latin-ext alt kumeleriyle (Turkce ğ ş ı İ bu ikisinde). Paketin wght.css'i
 * kiril/yunan/vietnam alt kumelerini de getirirdi; bu yuzden iki @font-face'i kendimiz tanimliyoruz.
 * unicode-range degerleri @fontsource-variable/inter 5.3.0 wght.css'ten birebir alindi.
 */
@font-face {
  font-family: 'Inter Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2')
    format('woff2-variations');
  unicode-range:
    U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329,
    U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F,
    U+A720-A7FF;
}

@font-face {
  font-family: 'Inter Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')
    format('woff2-variations');
  unicode-range:
    U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
    U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Tokenlar: gorsel tasarim spec'i Karar 2 (Stitch'in render ettigi degerler, okunur adlarla). */
@theme {
  --font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;

  --color-bg: #121316;
  --color-inset: #0d0e11;
  --color-surface-1: #1b1b1f;
  --color-surface-2: #1f1f23;
  --color-surface-3: #292a2d;
  --color-surface-4: #343538;
  --color-fg: #e3e2e6;
  --color-muted: #c5c6c8;
  --color-accent: #ff5722;
  --color-on-accent: #541200;
  --color-accent-soft: #ffb5a0;
  --color-danger: #ffb4ab;
  --color-danger-bg: #93000a;
  --color-on-danger-bg: #ffdad6;

  --text-title: 26px;
  --text-title--line-height: 32px;
  --text-title--letter-spacing: -0.025em;
  --text-title--font-weight: 700;
  --text-heading: 20px;
  --text-heading--line-height: 26px;
  --text-heading--letter-spacing: -0.02em;
  --text-heading--font-weight: 600;
  --text-metric: 28px;
  --text-metric--line-height: 32px;
  --text-metric--letter-spacing: -0.02em;
  --text-metric--font-weight: 700;
  --text-body-lg: 16px;
  --text-body-lg--line-height: 24px;
  --text-body-lg--font-weight: 500;
  --text-body: 14px;
  --text-body--line-height: 20px;
  --text-label: 12px;
  --text-label--line-height: 16px;
  --text-label--letter-spacing: 0.04em;
  --text-label--font-weight: 600;
  --text-label-xs: 10px;
  --text-label-xs--line-height: 12px;
  --text-label-xs--letter-spacing: 0.06em;
  --text-label-xs--font-weight: 700;
}

@layer base {
  /* Yalnizca koyu tema (Karar 5): yerel kontroller (select listesi, kaydirma cubugu) koyu cizilsin. */
  :root {
    color-scheme: dark;
  }

  body {
    background-color: var(--color-bg);
    color: var(--color-fg);
    font-family: var(--font-sans);
    -webkit-tap-highlight-color: transparent;
  }

  /* Stitch'in `focus:outline-none`'i yerine: klavye odagi her zaman gorunur (Karar 7). */
  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  /* Dokunma hedefi guvenlik agi: bilesenler kendi yuksekligini verir, bu alt sinirdir. */
  button,
  input,
  select {
    min-height: 44px;
  }
}
```

Eski `index.css` kuralları (`body` padding, `form` flex, `ul` padding) bilerek kalkar: yerleşimi artık
her ekran kendi sınıflarıyla verir.

- [ ] **Step 5: Doğrula — testler ve tip kontrolü**

Run: `cd web && npm run typecheck && npm run test`
Expected: tip hatası yok; 12 dosya, 65 test PASS (bu görev davranış değiştirmez).

- [ ] **Step 6: Doğrula — derleme çıktısı**

```bash
cd web && npm run build
ls dist/assets/*.woff2
grep -o 'inter-latin[a-z-]*-wght-normal-[A-Za-z0-9_-]*\.woff2' dist/sw.js | sort -u
grep -c -- '--color-bg' dist/assets/*.css
```

Expected:
- `dist/assets` altında TAM İKİ font: `inter-latin-wght-normal-<hash>.woff2` ve
  `inter-latin-ext-wght-normal-<hash>.woff2` (kiril/yunan/vietnam YOK).
- `sw.js` ikisini de precache listesinde içerir.
- CSS'te `--color-bg` en az bir kez geçer.

`url('@fontsource-variable/…')` Vite tarafından çözülmezse (derleme "could not resolve" ya da dist'te
font yok): `index.css`'teki iki `@font-face` bloğunu sil, yerine
`@import '@fontsource-variable/inter/wght.css';` koy (tüm alt kümeler `unicode-range` ile gelir,
tarayıcı yalnızca gerekeni indirir; precache yine yalnızca iki alt kümeyi alır). Bu sapmayı raporda
belirt.

- [ ] **Step 7: Commit**

```bash
git add web/package.json web/package-lock.json web/vite.config.ts web/index.html web/src/index.css
git commit -m "chore(web): tailwind v4, tasarim tokenlari ve inter fontu" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Uygulama kabuğu — üst başlık, hesap menüsü, alt sekme çubuğu

**Files:**
- Create: `web/src/ui/HesapMenusu.tsx`
- Modify: `web/src/App.tsx`, `web/src/App.test.tsx`

**Interfaces:**
- Consumes: Görev 1 tokenları; `useAuth().logout` (`web/src/auth/AuthContext.tsx`).
- Produces: `App` kabuğu — içerik `<main>` içinde, üstte 64 px başlık, altta 64 px sekme çubuğu
  (ikisi de güvenli alan boşluğuyla). Sekme çubuğu `<nav aria-label="Ana gezinme">`. Hesap menüsü
  tetikleyicisi `aria-label="Hesap menüsü"`, menü elemanı `id="hesap-menusu"`, `popover="auto"`.
  Görev 3, Bugün'ün sabit panelini sekme çubuğunun üstüne `bottom-[calc(4rem+env(safe-area-inset-bottom))]`
  ile yerleştirir.

jsdom Popover API'yi uygulamaz ve kapalı popover'ı varsayılan stiliyle gizler: testte menüdeki
"Çıkış yap" `{ hidden: true }` ile sorgulanır (uygulamada bulundu). Testler görünürlüğü değil,
yapıyı ve davranışı sınar (spec Riskler).

- [ ] **Step 1: Başarısız testi yaz**

`web/src/App.test.tsx`'in import satırlarını şununla değiştir (yalnızca `within` eklenir):

```tsx
import { render, screen, within } from '@testing-library/react';
```

Dosyanın sonuna ekle:

```tsx
test('cikis yap sekme cubugunda degil, hesap menusunun icinde', async () => {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <RouterProvider router={testRouterOlustur()} />
      </AuthProvider>
    </QueryClientProvider>,
  );

  await screen.findByText('Ic sayfa icerigi');

  const gezinme = screen.getByRole('navigation', { name: 'Ana gezinme' });
  expect(within(gezinme).queryByRole('button', { name: 'Çıkış yap' })).not.toBeInTheDocument();

  // Tetikleyici menuyu popovertarget ile acar; "Cikis yap" o menunun ICINDE (spec Karar 8).
  const tetikleyici = screen.getByRole('button', { name: 'Hesap menüsü' });
  expect(tetikleyici).toHaveAttribute('popovertarget', 'hesap-menusu');
  const menu = document.getElementById('hesap-menusu');
  expect(menu).toHaveAttribute('popover', 'auto');
  expect(menu).toContainElement(screen.getByRole('button', { name: 'Çıkış yap' }));
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run: `cd web && npx vitest run src/App.test.tsx`
Expected: yeni test FAIL — "Ana gezinme" adlı bir navigation ya da "Hesap menüsü" düğmesi yok.
Diğer 4 test PASS.

- [ ] **Step 3: `web/src/ui/HesapMenusu.tsx`'i yaz**

```tsx
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const MENU_ID = 'hesap-menusu';

/**
 * Hesap menusu -- tek ogesi "Cikis yap" (spec Karar 8). Popover API kullanilir: menu disari
 * dokununca ve Escape ile KENDILIGINDEN kapanir, ek JS/durum gerekmez; tetikleyici tarayicida
 * aria-expanded'i da kendisi tasir.
 *
 * Popover ust katmanda (top layer) acilir ve tarayicinin varsayilan stili onu ekranin ortasina
 * koyar (`inset: 0; margin: auto`) -- `inset-auto m-0` ile bunu sifirlayip basligin hemen altina,
 * saga hizaliyoruz. Varsayilan kenarlik ve ic bosluk da `border-0 p-1` ile ezilir.
 */
export default function HesapMenusu() {
  const { logout } = useAuth();

  return (
    <>
      <button
        type="button"
        popoverTarget={MENU_ID}
        aria-label="Hesap menüsü"
        className="flex size-11 items-center justify-center rounded-full bg-surface-3 text-fg"
      >
        <User aria-hidden size={20} />
      </button>
      <div
        id={MENU_ID}
        popover="auto"
        // Golge Stitch'in "Level 3" degeri; token karsiligi yok, tek seferlik.
        className="inset-auto top-16 right-4 m-0 w-44 rounded-lg border-0 bg-surface-3 p-1 text-fg shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
      >
        <button
          type="button"
          onClick={logout}
          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-label text-danger"
        >
          <LogOut aria-hidden size={16} />
          Çıkış yap
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 4: `web/src/App.tsx`'i tamamen şununla değiştir**

```tsx
import { NavLink, Outlet } from 'react-router-dom';
import { Calendar, History, Trophy, type LucideIcon } from 'lucide-react';
import HesapMenusu from './ui/HesapMenusu';

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
 * Korumali alanin ortak kabugu (spec Karar 8): ustte GRIND + hesap menusu, altta sekme cubugu,
 * aradaki icerik `Outlet`ten gelir. `NavLink` aktif baglantiya `aria-current="page"`yi KENDISI
 * koyar. Cikis artik hesap menusunde; cikistan sonra `ProtectedRoute` zaten `/login`e yonlendirir.
 *
 * `env(safe-area-inset-*)` hesaplari keyfi deger olarak yazilir: Tailwind'de guvenli alan tokeni
 * yok. 4rem = baslik ve sekme cubugu yuksekligi (h-16).
 */
export default function App() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="fixed inset-x-0 top-0 z-40 bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <span className="text-heading uppercase">GRIND</span>
          <HesapMenusu />
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
```

- [ ] **Step 5: Testleri çalıştır**

Run: `cd web && npx vitest run src/App.test.tsx`
Expected: 5 test PASS (4 eski + 1 yeni). Uygulamada: eski "cikis yap tiklaninca…" testi ve yeni test,
kapalı popover jsdom'da gizlendiği için "Çıkış yap" sorgusuna `{ hidden: true }` eklenerek geçer.

- [ ] **Step 6: Tüm doğrulama ve commit**

```bash
cd web && npm run typecheck && npm run test && npm run build
git add web/src/ui/HesapMenusu.tsx web/src/App.tsx web/src/App.test.tsx
git commit -m "feat(web): uygulama kabugu, alt sekme cubugu ve hesap menusu" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Expected: 66 test PASS.

---

### Task 3: Bugün ekranı — set listesi, set ekle paneli, boş durum

> **Uygulamada değişti:** `SayiAlani`'nın konumlandırılmış sarmalayıcısı `<div className="relative">`
> yerine `<span className="relative block">` oldu ve alan hatası onun DIŞINA, dış sütuna taşındı —
> aksi halde hata görünürken birim yazısı girdiden kayıyordu. Final incelemede "×" `font-light text-muted`
> yapıldı.

**Files:**
- Create: `web/src/ui/BirincilDugme.tsx`, `web/src/ui/Rozet.tsx`, `web/src/ui/Hap.tsx`,
  `web/src/ui/BosDurum.tsx`, `web/src/test/metin.ts`
- Modify: `web/src/pages/TodayPage.tsx`, `web/src/components/AddSetForm.tsx`,
  `web/src/components/SetList.tsx`
- Modify (test): `web/src/pages/TodayPage.test.tsx`, `web/src/pages/HistoryPage.test.tsx`

**Interfaces:**
- Consumes: Görev 1 tokenları; Görev 2 kabuğu (sekme çubuğu 4rem, `main` alt boşluğu onu zaten
  kapsar).
- Produces (Görev 4 ve 5 kullanır):
  - `BirincilDugme` — `ButtonHTMLAttributes` + `yukseklik: 'buyuk' | 'normal'` (56 / 52 px).
  - `Rozet` — `{ children }`; `accent` dolgulu, büyük harf. (Görev 4 `ton`, `ikon`, `tamYuvarlak`
    ekler.)
  - `Hap` — `{ children }`; RIR hapı.
  - `BosDurum` — `{ ikon: LucideIcon; baslik: string; aciklama?: string }`; başlık `<h2>`.
  - `tamMetin(metin: string): MatcherFunction` — metni birden fazla elemana bölünmüş bir değeri
    (örn. "60 kg × 8") tek parça olarak bulan test yardımcısı.
  - `SetList` set satırının değer metni (textContent): `"<ağırlık> kg × <tekrar>"`; rozet metni
    "Ağırlık rekoru" / "Tekrar rekoru".

**Metin değişiklikleri (spec'e göre, testler güncellenir):** "Set Ekle" → "Set ekle"; "Bugün henüz
antrenman yok." → "Bugün henüz antrenman yok" (artık bir başlık); set satırı "60 × 8" → "60 kg × 8";
rozet "ağırlık rekoru" → "Ağırlık rekoru". Etiketlerin erişilebilir adları DEĞİŞMEZ ("Egzersiz",
"Ağırlık (kg)", "Tekrar", "RIR (opsiyonel)") — görünmeyen kısımlar `sr-only` ile kalır.

- [ ] **Step 1: Test yardımcısını yaz — `web/src/test/metin.ts`**

```ts
import type { MatcherFunction } from '@testing-library/react';

/**
 * Tasarimda bir deger birden fazla elemana bolunur ("60" + <span>kg</span> + <span>×</span> + "8"),
 * bu yuzden `getByText('60 kg × 8')` onu bulamaz. Bu esleyici textContent'i TAM olarak `metin`
 * olan elemani bulur; ayni metni tasiyan bir cocugu varsa (yalnizca onu saran bir kapsayici)
 * kapsayiciyi degil cocugu secer, boylece tek bir eslesme kalir.
 */
export function tamMetin(metin: string): MatcherFunction {
  return (_icerik, eleman) =>
    eleman?.textContent === metin &&
    Array.from(eleman.children).every((cocuk) => cocuk.textContent !== metin);
}
```

- [ ] **Step 2: Testleri yeni metinlere ve yeni davranışlara göre güncelle (başarısız olacaklar)**

`web/src/pages/TodayPage.test.tsx`:
1. Import satırlarının sonuna ekle: `import { tamMetin } from '../test/metin';`
2. Dosyadaki HER `'Set Ekle'` → `'Set ekle'`.
3. HER `'Bugün henüz antrenman yok.'` → `'Bugün henüz antrenman yok'`.
4. `screen.findByText('60 × 8')` → `screen.findByText(tamMetin('60 kg × 8'))`;
   `screen.findByText('70 × 5')` → `screen.findByText(tamMetin('70 kg × 5'))`;
   `screen.findByText('0 × 12')` → `screen.findByText(tamMetin('0 kg × 12'))`.
5. `/ağırlık rekoru/` → `/ağırlık rekoru/i`; `/tekrar rekoru/` → `/tekrar rekoru/i`.
6. Dosyanın sonuna ekle:

```tsx
test('set eklenince durum satiri eklenen seti duyurur', async () => {
  // Spec davranis 5: sabit panel listeyi kismen ortebilir; eklenen set hem gorunur hem ekran
  // okuyucuya (role=status, polite) duyurulur. Dugmenin adi DEGISMEZ.
  sahteSunucuyuKur();

  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  await setEkle(kullanici, '82,5', '5');

  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('Eklendi: 82,5 kg × 5'),
  );
  expect(screen.getByRole('button', { name: 'Set ekle' })).toBeInTheDocument();
});

test('antrenmani bitir basarisiz olursa hata gosterilir ve dugme yerinde kalir', async () => {
  const acikOturum: SessionResponse = {
    id: 7,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: null,
    templateName: null,
    notes: null,
    progress: [],
  };
  sahteSunucuyuKur({ baslangicOturumu: acikOturum });
  server.use(
    http.post('/api/sessions/:id/finish', () =>
      HttpResponse.json({ title: 'Sunucu hatası', status: 500 }, { status: 500 }),
    ),
  );

  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Antrenmanı bitir' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Antrenman bitirilemedi. Lütfen tekrar deneyin.',
  );
  expect(screen.getByRole('button', { name: 'Antrenmanı bitir' })).toBeInTheDocument();
});
```

`web/src/pages/HistoryPage.test.tsx` (Geçmiş de `SetList` kullanır):
1. Import satırlarının sonuna ekle: `import { tamMetin } from '../test/metin';`
2. `screen.findByText('60 × 8')` → `screen.findByText(tamMetin('60 kg × 8'))`.

- [ ] **Step 3: Başarısız olduklarını doğrula**

Run: `cd web && npx vitest run src/pages/TodayPage.test.tsx src/pages/HistoryPage.test.tsx`
Expected: FAIL — "Set ekle" düğmesi, "60 kg × 8" metni, `status` rolü ve bitir hatası bulunamaz.

- [ ] **Step 4: UI bileşenlerini yaz**

`web/src/ui/BirincilDugme.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react';

// Stitch: "Set ekle" 56 px, giris/kayit dugmeleri 52 px.
const YUKSEKLIK = { buyuk: 'h-14', normal: 'h-13' } as const;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  yukseklik: keyof typeof YUKSEKLIK;
}

/** Accent dolgulu birincil eylem; ustundeki metin her zaman `on-accent` (spec Karar 2). */
export default function BirincilDugme({ yukseklik, type = 'button', ...dugme }: Props) {
  return (
    <button
      type={type}
      {...dugme}
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-accent text-body-lg font-bold text-on-accent disabled:opacity-60 ${YUKSEKLIK[yukseklik]}`}
    />
  );
}
```

`web/src/ui/Rozet.tsx`:

```tsx
import type { ReactNode } from 'react';

/** Rekor rozeti: accent dolgu + on-accent metin; buyuk harf CSS ile (kaynak metin normal). */
export default function Rozet({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-label-xs text-on-accent uppercase">
      {children}
    </span>
  );
}
```

`web/src/ui/Hap.tsx`:

```tsx
import type { ReactNode } from 'react';

/** Kucuk bilgi hapi (orn. "RIR 2"). */
export default function Hap({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded bg-surface-3 px-2 py-1 text-label text-muted tabular-nums">
      {children}
    </span>
  );
}
```

`web/src/ui/BosDurum.tsx`:

```tsx
import type { LucideIcon } from 'lucide-react';

interface Props {
  ikon: LucideIcon;
  baslik: string;
  aciklama?: string;
}

/** Ortali bos durum: daire icinde ikon, baslik ve istege bagli aciklama (Stitch bos durumu). */
export default function BosDurum({ ikon: Ikon, baslik, aciklama }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Ikon aria-hidden size={32} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-heading">{baslik}</h2>
        {aciklama && <p className="text-body text-muted">{aciklama}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `web/src/components/SetList.tsx`'i tamamen şununla değiştir**

```tsx
import { useMemo } from 'react';
import type { SetKaydi } from '../api/queries';
import { formatWeight } from '../lib/format';
import Rozet from '../ui/Rozet';
import Hap from '../ui/Hap';

interface Props {
  sets: SetKaydi[];
  // Bos durumda gosterilecek metin cagiran tarafa birakilir (T5): TodayPage "bugun" baglaminda
  // (varsayilan), HistoryPage ise gecmis bir gunu gosterirken "Bugün..." metnini KULLANAMAZ.
  bosDurumMetni?: string;
}

interface EgzersizGrubu {
  exerciseId: number;
  exerciseName: string;
  sets: SetKaydi[];
}

/**
 * PR rozeti dogrudan sunucunun `recordType`'indan cizilir -- rekor istemcide YENIDEN
 * HESAPLANMAZ (spec). `None` icin rozet yok. Buyuk harf CSS ile gelir.
 */
function rekorRozetiMetni(kayit: SetKaydi): string | null {
  if (kayit.recordType === 'Weight') {
    return 'Ağırlık rekoru';
  }
  if (kayit.recordType === 'Reps') {
    return 'Tekrar rekoru';
  }
  return null;
}

/**
 * Setler egzersize gore gruplanir, grup icinde kronolojik sira korunur (spec). Grup numarasi ve
 * "N SET" ekrandaki listenin sunumudur (satir sayisi), sunucu hesabinin tekrari degildir.
 *
 * Deger metni (`60 kg × 8`) bosluklari `{' '}` ile acikca tasir: textContent tek parca okunabilsin
 * (ekran okuyucu ve testler), gorsel olarak ise birim ve "×" soluk kalsin.
 */
export default function SetList({ sets, bosDurumMetni = 'Bugün henüz set eklenmedi.' }: Props) {
  const gruplar = useMemo(() => {
    const harita = new Map<number, EgzersizGrubu>();
    for (const kayit of sets) {
      const mevcutGrup = harita.get(kayit.exerciseId);
      if (mevcutGrup) {
        mevcutGrup.sets.push(kayit);
      } else {
        harita.set(kayit.exerciseId, {
          exerciseId: kayit.exerciseId,
          exerciseName: kayit.exerciseName,
          sets: [kayit],
        });
      }
    }
    return Array.from(harita.values());
  }, [sets]);

  if (gruplar.length === 0) {
    return <p className="text-body text-muted">{bosDurumMetni}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {gruplar.map((grup, grupSirasi) => (
        <section key={grup.exerciseId} className="flex flex-col gap-2 rounded-xl bg-surface-1 p-4">
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-label"
              >
                {grupSirasi + 1}
              </span>
              <h2 className="truncate text-heading">{grup.exerciseName}</h2>
            </div>
            <span className="shrink-0 text-label-xs text-muted uppercase">{grup.sets.length} set</span>
          </div>
          <ul className="flex flex-col gap-1">
            {grup.sets.map((kayit, setSirasi) => {
              const rozet = rekorRozetiMetni(kayit);
              return (
                <li
                  key={kayit.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 p-2"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="w-12 shrink-0 text-label text-muted">{setSirasi + 1}. Set</span>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-metric tabular-nums">
                        {formatWeight(kayit.weight)}{' '}
                        <span className="text-body text-muted">kg</span>{' '}
                        <span className="text-muted">×</span> {kayit.reps}
                      </span>
                      {rozet && <Rozet>{rozet}</Rozet>}
                    </div>
                  </div>
                  {kayit.rir !== null && <Hap>RIR {kayit.rir}</Hap>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: `web/src/components/AddSetForm.tsx` — içe aktarmalar, alan bileşeni, durum satırı ve görünüm**

Dosyanın import bloğunu şununla değiştir:

```tsx
import { useMemo, useRef, useState, type FormEvent, type Ref } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronsUpDown, Plus } from 'lucide-react';
import { queryKeys, useAddSet, useExercises, useOpenSession } from '../api/queries';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { ApiError } from '../api/problem';
import { formatWeight } from '../lib/format';
import BirincilDugme from '../ui/BirincilDugme';
```

`BILINEN_ALANLAR` sabitinin ALTINA (ve `export default function AddSetForm` ÜSTÜNE) ekle:

```tsx
interface SayiAlaniProps {
  id: string;
  etiket: string;
  // Gorunmeyen ama erisilebilir ada giren ek (orn. " (kg)") -- etiket gorselde kisa kalir.
  ekranOkuyucuEki?: string;
  birim: string;
  inputMode: 'decimal' | 'numeric';
  placeholder: string;
  value: string;
  onChange: (deger: string) => void;
  hata?: string;
  girdiRef?: Ref<HTMLInputElement>;
}

/**
 * Paneldeki kompakt sayi alani. Girdi kutunun TAMAMIDIR (60 px dokunma hedefi); etiket ve birim
 * onun ustune bindirilir ve `pointer-events-none` ile dokunmayi girdiye birakir. Birim `aria-hidden`
 * -- erisilebilir ad etiketten gelir ("Ağırlık (kg)").
 */
function SayiAlani({
  id,
  etiket,
  ekranOkuyucuEki,
  birim,
  inputMode,
  placeholder,
  value,
  onChange,
  hata,
  girdiRef,
}: SayiAlaniProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <input
          id={id}
          ref={girdiRef}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-15 w-full rounded-lg bg-inset pt-5 pr-12 pl-2 text-heading text-fg tabular-nums placeholder:text-muted/40 focus:bg-surface-2"
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute top-2 left-2 text-label-xs text-muted uppercase"
        >
          {etiket}
          {ekranOkuyucuEki && <span className="sr-only">{ekranOkuyucuEki}</span>}
        </label>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-2.5 text-label-xs text-muted"
        >
          {birim}
        </span>
      </div>
      {hata && <p role="alert" className="text-label text-danger">{hata}</p>}
    </div>
  );
}
```

`AddSetForm` içinde `alanHatalari` state satırının ALTINA ekle:

```tsx
  // Spec davranis 5: son eklenen set gorunur + role=status ile duyurulur; bir sonraki gonderimde
  // ya da hatada temizlenir. Dugmenin adi degismez.
  const [sonEklenen, setSonEklenen] = useState<string | null>(null);
```

`gonder` fonksiyonunda `setAlanHatalari({});` satırının ALTINA ekle:

```tsx
    setSonEklenen(null);
```

`gonder` içinde `agirlikRef.current?.focus();` satırının ÜSTÜNE ekle:

```tsx
      setSonEklenen(`Eklendi: ${formatWeight(ayristirilmisAgirlik)} kg × ${ayristirilmisTekrar}`);
```

Bileşenin `return (...)` bloğunu tamamen şununla değiştir:

```tsx
  return (
    // Panel sekme cubugunun HEMEN ustunde sabit (spec): 4rem = sekme cubugu yuksekligi (h-16).
    <form
      onSubmit={gonder}
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 pb-2"
    >
      <div className="mx-auto flex max-w-md flex-col gap-2 rounded-xl bg-surface-3 p-4 shadow-2xl">
        {genelHata && <p role="alert" className="text-label text-danger">{genelHata}</p>}
        <div className="relative">
          <label htmlFor="set-egzersiz" className="sr-only">
            Egzersiz
          </label>
          <select
            id="set-egzersiz"
            value={egzersizId}
            onChange={(e) => setManuelSecim(e.target.value)}
            className="h-12 w-full appearance-none rounded-lg bg-inset pr-10 pl-4 text-body-lg text-fg"
          >
            {siraliEgzersizler.map((eg) => (
              <option key={eg.id} value={eg.id}>
                {eg.name}
              </option>
            ))}
          </select>
          <ChevronsUpDown
            aria-hidden
            size={20}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SayiAlani
            id="set-agirlik"
            etiket="Ağırlık"
            ekranOkuyucuEki=" (kg)"
            birim="kg"
            inputMode="decimal"
            placeholder="0"
            value={agirlik}
            onChange={setAgirlik}
            hata={alanHatalari.weight}
            girdiRef={agirlikRef}
          />
          <SayiAlani
            id="set-tekrar"
            etiket="Tekrar"
            birim="tekrar"
            inputMode="numeric"
            placeholder="0"
            value={tekrar}
            onChange={setTekrar}
            hata={alanHatalari.reps}
          />
          <SayiAlani
            id="set-rir"
            etiket="RIR"
            ekranOkuyucuEki=" (opsiyonel)"
            birim="kalan"
            inputMode="numeric"
            placeholder="—"
            value={rir}
            onChange={setRir}
            hata={alanHatalari.rir}
          />
        </div>
        <p role="status" className="min-h-4 text-label text-muted">
          {sonEklenen}
        </p>
        <BirincilDugme type="submit" yukseklik="buyuk" disabled={eklemeMutasyonu.isPending}>
          <Plus aria-hidden size={24} />
          Set ekle
        </BirincilDugme>
      </div>
    </form>
  );
```

Dosyadaki diğer her şey (doğrulama, hata ayrıştırma, ağ hatası invalidasyonu, yorumlar) AYNEN kalır.

- [ ] **Step 7: `web/src/pages/TodayPage.tsx`'i tamamen şununla değiştir**

```tsx
import { CircleCheck, Dumbbell } from 'lucide-react';
import { useOpenSession, useSessionSets, useFinishSession } from '../api/queries';
import { formatTrTime } from '../lib/format';
import SetList from '../components/SetList';
import AddSetForm from '../components/AddSetForm';
import BosDurum from '../ui/BosDurum';

/**
 * "Bugun" ekrani -- dilimin kalbi. Acik oturum varsa baslangic saati (TR) ve setleri gosterir;
 * yoksa (404 -> null, spec) bos durum. Set ekleme paneli HER DURUMDA render edilir: ilk set
 * sunucu tarafinda oturumu kendiliginden acar -- ayri bir "oturum baslat" dugmesi yok.
 *
 * DIKKAT (review bulgusu): oturum ve set sorgularinin HATA durumu bos durumdan AYRI ve ONCELIKLI
 * gosterilir -- bir sunucu kesintisini "bugun henuz antrenman yok" ile karistirmak, gercekte var
 * olan bir oturumu gizler.
 *
 * "Antrenmani bitir" basliktadir, "Set ekle"den uzakta (spec): yanlislikla basilirsa sonraki set
 * ayni gun yeni bir antrenman acar. Basarisiz olursa hata gosterilir (spec davranis 4).
 *
 * `pb-72` (18rem): sabit set ekle paneli (~240 px) listenin son satirini ortmesin; sekme cubugunun
 * boslugunu ise kabuk (`App`) zaten verir.
 */
export default function TodayPage() {
  const { data: oturum, isLoading: oturumYukleniyor, isError: oturumHataliMi } = useOpenSession();
  const gorunenOturum = !oturumYukleniyor && !oturumHataliMi ? (oturum ?? null) : null;
  const {
    data: setler,
    isLoading: setlerYukleniyor,
    isError: setlerHataliMi,
  } = useSessionSets(oturum?.id ?? null);
  const bitirMutasyonu = useFinishSession();

  return (
    <div className="flex flex-col gap-5 pt-2 pb-72">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-title">Bugün</h1>
          {gorunenOturum?.isOpen && (
            <button
              type="button"
              onClick={() => bitirMutasyonu.mutate(gorunenOturum.id)}
              disabled={bitirMutasyonu.isPending}
              className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-label text-muted disabled:opacity-60"
            >
              <CircleCheck aria-hidden size={18} />
              Antrenmanı bitir
            </button>
          )}
        </div>
        {gorunenOturum && (
          <div className="flex items-center gap-2">
            {gorunenOturum.isOpen && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-label">
                <span aria-hidden className="size-2 rounded-full bg-muted motion-safe:animate-pulse" />
                Devam ediyor
              </span>
            )}
            <span className="text-label text-muted">Başlangıç {formatTrTime(gorunenOturum.startedAt)}</span>
          </div>
        )}
        {bitirMutasyonu.isError && (
          <p role="alert" className="text-label text-danger">
            Antrenman bitirilemedi. Lütfen tekrar deneyin.
          </p>
        )}
      </header>

      {oturumYukleniyor && <p className="text-body text-muted">Yükleniyor...</p>}

      {oturumHataliMi && (
        <p role="alert" className="text-body text-danger">
          Oturum bilgisi alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {gorunenOturum && (
        <>
          {setlerYukleniyor && <p className="text-body text-muted">Yükleniyor...</p>}
          {setlerHataliMi && (
            <p role="alert" className="text-body text-danger">
              Setler alınamadı. Lütfen sayfayı yenileyin.
            </p>
          )}
          {!setlerYukleniyor && !setlerHataliMi && <SetList sets={setler ?? []} />}
        </>
      )}

      {!oturumYukleniyor && !oturumHataliMi && !oturum && (
        <BosDurum
          ikon={Dumbbell}
          baslik="Bugün henüz antrenman yok"
          aciklama="İlk seti ekleyerek antrenmanı başlatın."
        />
      )}

      <AddSetForm />
    </div>
  );
}
```

- [ ] **Step 8: Testleri çalıştır**

Run: `cd web && npx vitest run src/pages/TodayPage.test.tsx src/pages/HistoryPage.test.tsx`
Expected: TodayPage 19 test (17 + 2) ve HistoryPage 7 test PASS.

- [ ] **Step 9: Tüm doğrulama ve commit**

```bash
cd web && npm run typecheck && npm run test && npm run build
git add web/src/ui web/src/test/metin.ts web/src/components web/src/pages/TodayPage.tsx web/src/pages/TodayPage.test.tsx web/src/pages/HistoryPage.test.tsx
git commit -m "feat(web): bugun ekrani tasarimi, set ekle paneli ve durum satiri" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Expected: 68 test PASS.

---

### Task 4: Geçmiş ve Rekorlar ekranları

> **Uygulamada değişti:** Rekorlar testindeki kart kapsamlı `getByText` satırları yetersizdi (tarihler
> yer değiştirse de geçiyordu); her rozetin kendi satırına (`closest('div')`) kapsanan `within`
> doğrulamaları kullanıldı. Final incelemede Geçmiş özetine `focus-visible:-outline-offset-2` eklendi
> (odak halkası kartın `overflow-hidden`'ı yüzünden kırpılıyordu).

**Files:**
- Modify: `web/src/ui/Rozet.tsx`, `web/src/components/SetList.tsx`, `web/src/pages/HistoryPage.tsx`,
  `web/src/pages/RecordsPage.tsx`
- Modify (test): `web/src/pages/HistoryPage.test.tsx`, `web/src/pages/RecordsPage.test.tsx`

**Interfaces:**
- Consumes: Görev 3'ün `Rozet`, `Hap`, `BosDurum`, `SetList`, `tamMetin`.
- Produces: `Rozet` props `{ children; ton?: 'dolu' | 'acik'; ikon?: LucideIcon; tamYuvarlak?: boolean }`;
  `SetList` prop `varyant?: 'bugun' | 'gecmis'` (varsayılan `'bugun'`).

**Metin değişiklikleri:** "Henüz antrenman geçmişi yok." → "Henüz antrenman geçmişi yok" ve "Henüz rekor
yok." → "Henüz rekor yok" (artık `BosDurum` başlığı); "Bu oturumda set yok." → "Bu antrenmanda set
yok." (spec davranış 6); Rekorlar satırları "En ağır set: 100 × 3 (01.08.2026)" → rozet "En ağır set",
"· 01.08.2026", "100 kg", "× 3"; "En çok tekrar: 12 × 60 (15.07.2026)" → rozet "En çok tekrar",
"· 15.07.2026", "12 tekrar", "@ 60 kg". Yeni: sayfalamada "Sayfa 1 / 2" ve "40 antrenman".

- [ ] **Step 1: Testleri güncelle (başarısız olacaklar)**

`web/src/pages/HistoryPage.test.tsx`:
1. HER `'Henüz antrenman geçmişi yok.'` → `'Henüz antrenman geçmişi yok'`.
2. `'Bu oturumda set yok.'` → `'Bu antrenmanda set yok.'`
3. "sonraki sayfaya gecilebilir…" testinde `await screen.findAllByRole('listitem');` satırının ALTINA
   ekle:

```tsx
  // Sayfa bilgisi ve toplam sayi sunucunun zarfindan gelir, istemcide hesaplanmaz (spec).
  expect(screen.getByText('Sayfa 1 / 2')).toBeInTheDocument();
  expect(screen.getByText('40 antrenman')).toBeInTheDocument();
```

`web/src/pages/RecordsPage.test.tsx`:
1. İlk import satırını şununla değiştir: `import { render, screen, within } from '@testing-library/react';`
2. HER `'Henüz rekor yok.'` → `'Henüz rekor yok'`.
3. İlk testteki üç `expect` satırını (`findByText('Bench Press')` dahil) şununla değiştir:

```tsx
  const kart = (await screen.findByRole('heading', { name: 'Bench Press' })).closest('li');
  expect(kart).not.toBeNull();
  const kartIci = within(kart as HTMLElement);
  // Bu iki gercek FARKLI setler olabilir (spec) -- istemci hicbirini HESAPLAMAZ, sunucunun
  // verdigi degerleri oldugu gibi gosterir.
  expect(kartIci.getByText('En ağır set')).toBeInTheDocument();
  expect(kartIci.getByText('· 01.08.2026')).toBeInTheDocument();
  expect(kartIci.getByText('100 kg')).toBeInTheDocument();
  expect(kartIci.getByText('× 3')).toBeInTheDocument();
  expect(kartIci.getByText('En çok tekrar')).toBeInTheDocument();
  expect(kartIci.getByText('· 15.07.2026')).toBeInTheDocument();
  expect(kartIci.getByText('12 tekrar')).toBeInTheDocument();
  expect(kartIci.getByText('@ 60 kg')).toBeInTheDocument();
```

- [ ] **Step 2: Başarısız olduklarını doğrula**

Run: `cd web && npx vitest run src/pages/HistoryPage.test.tsx src/pages/RecordsPage.test.tsx`
Expected: FAIL — noktasız boş durum başlıkları, "Bu antrenmanda set yok.", "Sayfa 1 / 2" ve yeni rekor
satırları yok.

- [ ] **Step 3: `web/src/ui/Rozet.tsx`'i tamamen şununla değiştir**

```tsx
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

const TON = {
  // Dolu: accent zemin + on-accent metin. Acik: accent'in %20'si + accent-soft metin (spec Karar 2).
  dolu: 'bg-accent text-on-accent',
  acik: 'bg-accent/20 text-accent-soft',
} as const;

interface Props {
  children: ReactNode;
  ton?: keyof typeof TON;
  ikon?: LucideIcon;
  tamYuvarlak?: boolean;
}

/** Rozet: buyuk harf CSS ile (kaynak metin normal yazilir). */
export default function Rozet({ children, ton = 'dolu', ikon: Ikon, tamYuvarlak = false }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-label-xs uppercase ${TON[ton]} ${
        tamYuvarlak ? 'rounded-full' : 'rounded'
      }`}
    >
      {Ikon && <Ikon aria-hidden size={12} />}
      {children}
    </span>
  );
}
```

- [ ] **Step 4: `web/src/components/SetList.tsx` — Geçmiş varyantı**

İçe aktarmalara ekle: `import { Flame, Zap } from 'lucide-react';`

`Props` arayüzüne ekle:

```tsx
  // 'bugun': buyuk degerli kart satirlari (Bugun). 'gecmis': Gecmis kartinin icinde kompakt satirlar.
  varyant?: 'bugun' | 'gecmis';
```

Fonksiyon imzasını şununla değiştir:

```tsx
export default function SetList({
  sets,
  bosDurumMetni = 'Bugün henüz set eklenmedi.',
  varyant = 'bugun',
}: Props) {
```

`if (gruplar.length === 0) { … }` bloğunun ALTINA, mevcut `return (` ÜSTÜNE ekle:

```tsx
  if (varyant === 'gecmis') {
    return (
      <div className="flex flex-col gap-5">
        {gruplar.map((grup) => (
          <section key={grup.exerciseId} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <h3 className="truncate text-body-lg font-semibold">{grup.exerciseName}</h3>
              <span className="shrink-0 rounded bg-surface-1 px-2 py-0.5 text-label-xs text-muted uppercase">
                {grup.sets.length} set
              </span>
            </div>
            <ul className="flex flex-col gap-1">
              {grup.sets.map((kayit, setSirasi) => {
                const rozet = rekorRozetiMetni(kayit);
                return (
                  <li
                    key={kayit.id}
                    className="flex min-h-12 flex-col justify-center gap-1.5 rounded-lg bg-surface-1 px-4 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-4">
                        <span className="w-5 text-label text-muted">{setSirasi + 1}</span>
                        <span className="text-body-lg tabular-nums">
                          {formatWeight(kayit.weight)} kg{' '}
                          <span className="text-muted">×</span> {kayit.reps}
                        </span>
                      </div>
                      {kayit.rir !== null && <Hap>RIR {kayit.rir}</Hap>}
                    </div>
                    {rozet && (
                      <div>
                        <Rozet ikon={kayit.recordType === 'Weight' ? Zap : Flame} tamYuvarlak>
                          {rozet}
                        </Rozet>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    );
  }
```

- [ ] **Step 5: `web/src/pages/HistoryPage.tsx`'i tamamen şununla değiştir**

```tsx
import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { useHistory } from '../api/queries';
import { formatTrDate, formatWeight } from '../lib/format';
import SetList from '../components/SetList';
import BosDurum from '../ui/BosDurum';

// Sayfalama dugmeleri (Stitch: 52 px).
const SAYFA_DUGMESI =
  'flex h-13 flex-1 items-center justify-center gap-1 rounded-xl bg-surface-2 text-label uppercase disabled:text-muted disabled:opacity-60';

/**
 * "Gecmis" ekrani -- sunucunun sayfali zarfini oldugu gibi gosterir. Sira, sayfa bilgisi, toplam
 * sayi ve hacim TAMAMEN sunucudan gelir (spec); istemci hicbir seyi yeniden HESAPLAMAZ veya
 * SIRALAMAZ.
 *
 * Bir oturumun setleri (R12) yerinde acilan native `<details>` ile gosterilir -- setler yanitin
 * ICINDE geldigi icin ekstra istek yok; native eleman klavye/ekran okuyucu erisilebilirligini
 * kendiliginden saglar. `group-open:` o eleman acikken ozeti ve gostergeyi degistirir.
 * `[&::-webkit-details-marker]:hidden` Safari'nin varsayilan ucgenini gizler (`list-none` digerleri icin).
 *
 * Hata durumu bos durumdan AYRI ve ONCELIKLI gosterilir.
 */
export default function HistoryPage() {
  const [sayfa, setSayfa] = useState(1);
  const { data, isLoading, isError } = useHistory(sayfa);

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      <h1 className="text-title">Geçmiş</h1>

      {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          Geçmiş alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <BosDurum ikon={CalendarDays} baslik="Henüz antrenman geçmişi yok" />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-4">
            {data.items.map((oturum) => {
              const bos = oturum.setCount === 0;
              return (
                <li
                  key={oturum.sessionId}
                  className={`overflow-hidden rounded-xl bg-surface-2 ${bos ? 'opacity-80' : ''}`}
                >
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 group-open:bg-surface-3 [&::-webkit-details-marker]:hidden">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="flex items-center gap-1 text-label">
                          <CalendarDays aria-hidden size={18} className="text-muted" />
                          {formatTrDate(oturum.startedAt)}
                        </span>
                        <span className="flex items-baseline gap-4">
                          <span className="flex items-baseline gap-1">
                            <span className={`text-metric tabular-nums ${bos ? 'text-muted' : ''}`}>
                              {oturum.setCount}
                            </span>{' '}
                            <span className="text-label-xs text-muted uppercase">set</span>
                          </span>
                          <span className="flex items-baseline gap-1">
                            <span className={`text-metric tabular-nums ${bos ? 'text-muted' : ''}`}>
                              {formatWeight(oturum.totalVolume)}
                            </span>{' '}
                            <span className="text-label-xs text-muted uppercase">kg</span>
                          </span>
                        </span>
                      </div>
                      <span
                        aria-hidden
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted group-open:bg-surface-4 group-open:text-fg"
                      >
                        <ChevronDown size={20} className="group-open:hidden" />
                        <ChevronUp size={20} className="hidden group-open:block" />
                      </span>
                    </summary>
                    <div className="p-4">
                      <SetList varyant="gecmis" sets={oturum.sets} bosDurumMetni="Bu antrenmanda set yok." />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setSayfa((s) => s - 1)}
              disabled={data.page <= 1}
              className={SAYFA_DUGMESI}
            >
              <ChevronLeft aria-hidden size={18} />
              Önceki
            </button>
            <div className="flex shrink-0 flex-col items-center px-2">
              <span className="text-label tabular-nums">
                Sayfa {data.page} / {data.totalPages}
              </span>
              <span className="text-label-xs text-muted">{data.totalCount} antrenman</span>
            </div>
            <button
              type="button"
              onClick={() => setSayfa((s) => s + 1)}
              disabled={data.page >= data.totalPages}
              className={SAYFA_DUGMESI}
            >
              Sonraki
              <ChevronRight aria-hidden size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

`SAYFA_DUGMESI` sabit bir sınıf dizgisidir, iki düğmede aynı; ayrı bir bileşen gerekmez (tek dosya,
iki kullanım).

- [ ] **Step 6: `web/src/pages/RecordsPage.tsx`'i tamamen şununla değiştir**

```tsx
import { Trophy } from 'lucide-react';
import { useRecords } from '../api/queries';
import { formatTrDate, formatWeight } from '../lib/format';
import BosDurum from '../ui/BosDurum';
import Rozet from '../ui/Rozet';

/**
 * "Rekorlar" ekrani -- her egzersiz icin en agir seti ve en cok tekrari AYRI AYRI gosterir
 * (spec): bunlar cogu zaman farkli setlerdir. Sunucunun dondugu degerler oldugu gibi gosterilir,
 * istemci hicbir rekoru YENIDEN HESAPLAMAZ. Kartlar etkilesimsizdir.
 */
export default function RecordsPage() {
  const { data, isLoading, isError } = useRecords();

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-title">Rekorlar</h1>
        <p className="text-body text-muted">Kişisel en iyiler</p>
      </header>

      {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          Rekorlar alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <BosDurum ikon={Trophy} baslik="Henüz rekor yok" />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <ul className="flex flex-col gap-4">
          {data.map((rekor) => (
            <li key={rekor.exerciseId} className="flex flex-col gap-4 rounded-xl bg-surface-2 p-4">
              <h2 className="flex items-center gap-2.5 text-heading">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
                {rekor.exerciseName}
              </h2>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1 rounded-lg bg-surface-1 p-3">
                  <p className="flex items-center gap-1.5">
                    <Rozet>En ağır set</Rozet>
                    <span className="text-label-xs text-muted">· {formatTrDate(rekor.bestWeightAt)}</span>
                  </p>
                  <p className="flex items-baseline gap-1">
                    <span className="text-metric tabular-nums">{formatWeight(rekor.bestWeight)} kg</span>
                    <span className="text-body-lg font-bold text-accent-soft">× {rekor.bestWeightReps}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-surface-1 p-3">
                  <p className="flex items-center gap-1.5">
                    <Rozet ton="acik">En çok tekrar</Rozet>
                    <span className="text-label-xs text-muted">· {formatTrDate(rekor.bestRepsAt)}</span>
                  </p>
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-metric tabular-nums">{rekor.bestReps} tekrar</span>
                    <span className="text-body text-muted">@ {formatWeight(rekor.bestRepsWeight)} kg</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Testleri çalıştır**

Run: `cd web && npx vitest run src/pages/HistoryPage.test.tsx src/pages/RecordsPage.test.tsx src/pages/TodayPage.test.tsx`
Expected: History 7, Records 4, Today 19 test PASS (Today, `SetList`'in varsayılan varyantıyla
değişmeden geçer).

- [ ] **Step 8: Tüm doğrulama ve commit**

```bash
cd web && npm run typecheck && npm run test && npm run build
git add web/src/ui/Rozet.tsx web/src/components/SetList.tsx web/src/pages/HistoryPage.tsx web/src/pages/RecordsPage.tsx web/src/pages/HistoryPage.test.tsx web/src/pages/RecordsPage.test.tsx
git commit -m "feat(web): gecmis ve rekorlar ekrani tasarimi" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Expected: 68 test PASS.

---

### Task 5: Giriş ve Kayıt ekranları — ortak düzen, şifre göster, şifre tekrarı

> **Uygulamada eklendi:** final incelemede, şifrenin kendisi hatalıyken ikinci bir "Şifreler
> eşleşmiyor." hatası eklenmediğini doğrulayan test (Kayıt 5 test).

**Files:**
- Create: `web/src/ui/AuthLayout.tsx`, `web/src/ui/Alan.tsx`, `web/src/ui/SifreAlani.tsx`,
  `web/src/ui/HataKutusu.tsx`, `web/src/ui/SifreAlani.test.tsx`
- Modify: `web/src/pages/LoginPage.tsx`, `web/src/pages/RegisterPage.tsx`
- Modify (test): `web/src/pages/LoginPage.test.tsx`, `web/src/pages/RegisterPage.test.tsx`

**Interfaces:**
- Consumes: Görev 3'ün `BirincilDugme` (`yukseklik="normal"`).
- Produces: `Alan` (`AlanProps`: `InputHTMLAttributes` + `id`, `etiket`, `ikon: LucideIcon`,
  `ipucu?`, `hata?`, `sagEk?: ReactNode`), `SifreAlani` (`Alan` props'u, `type`/`sagEk` hariç; `ikon`
  varsayılan `Lock`; `gosterEtiketi` varsayılan "Şifreyi göster"), `HataKutusu` (`baslik`, `mesaj`),
  `AuthLayout` (`baslik`, `aciklama?`, `children`, `altBaglanti: ReactNode`).

**Karar (spec'teki "aria-label Şifreyi göster / Şifreyi gizle" + "aria-pressed" ifadesi):** ikisi
birlikte durumu iki kez bildirir (erişilebilirlik kalıbına aykırı). Sabit ad ("Şifreyi göster") +
`aria-pressed` kullanılır; göz ikonu durumu görsel olarak değiştirir. Kayıt'taki ikinci alanın düğmesi
"Şifre tekrarını göster" adını alır — sayfada aynı adlı iki düğme olmaz.

**Metin değişiklikleri:** "Giriş Yap" → "Giriş yap", "Kayıt Ol" → "Kayıt ol" (başlık ve düğme).
Genel hata artık başlıklı bir kutu ("Giriş başarısız" / "Kayıt başarısız" + mesaj); `role="alert"`
kutunun kendisinde, mesaj metni aynen korunur.

- [ ] **Step 1: Başarısız testleri yaz**

`web/src/ui/SifreAlani.test.tsx`:

```tsx
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SifreAlani from './SifreAlani';

function Sarmalayici() {
  const [deger, setDeger] = useState('gizli1234');
  return (
    <SifreAlani id="sifre" etiket="Şifre" value={deger} onChange={(e) => setDeger(e.target.value)} />
  );
}

test('goster dugmesi sifreyi gorunur yapar ve durumunu aria-pressed ile bildirir', async () => {
  const kullanici = userEvent.setup();
  render(<Sarmalayici />);

  const alan = screen.getByLabelText('Şifre');
  const dugme = screen.getByRole('button', { name: 'Şifreyi göster' });
  expect(alan).toHaveAttribute('type', 'password');
  expect(dugme).toHaveAttribute('aria-pressed', 'false');

  await kullanici.click(dugme);
  expect(alan).toHaveAttribute('type', 'text');
  expect(dugme).toHaveAttribute('aria-pressed', 'true');

  await kullanici.click(dugme);
  expect(alan).toHaveAttribute('type', 'password');
});
```

`web/src/pages/LoginPage.test.tsx`: HER `'Giriş Yap'` → `'Giriş yap'`.

`web/src/pages/RegisterPage.test.tsx`:
1. HER `'Kayıt Ol'` → `'Kayıt ol'`.
2. Mevcut ÜÇ testin her birinde, `screen.getByLabelText('Şifre')`'ye yazan satırın HEMEN ALTINA aynı
   değerle şifre tekrarını ekle:
   - 1. test: `await kullanici.type(screen.getByLabelText('Şifre tekrarı'), 'gecerlisifre');`
   - 2. test: `await kullanici.type(screen.getByLabelText('Şifre tekrarı'), cokBaytliSifre);`
   - 3. test: `await kullanici.type(screen.getByLabelText('Şifre tekrarı'), 'gecerlisifre');`
3. Dosyanın sonuna ekle:

```tsx
test('sifre tekrari eslesmezse istek gitmez ve alan hatasi gosterilir', async () => {
  // Spec davranis 1: uygulamada sifre sifirlama yok -- kayittaki bir yazim hatasi hesabi kalici
  // kilitlerdi.
  let istekYapildiMi = false;
  server.use(
    http.post('/api/auth/register', () => {
      istekYapildiMi = true;
      return HttpResponse.json({ token: 't', expiresAtUtc: new Date().toISOString(), username: 'x' });
    }),
  );

  const kullanici = userEvent.setup();
  kayitSayfasiniOlustur();

  await kullanici.type(screen.getByLabelText('Kullanıcı adı'), 'gecerli_kullanici');
  await kullanici.type(screen.getByLabelText('Şifre'), 'gecerlisifre');
  await kullanici.type(screen.getByLabelText('Şifre tekrarı'), 'baskasifre1');
  await kullanici.click(screen.getByRole('button', { name: 'Kayıt ol' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Şifreler eşleşmiyor.');
  expect(istekYapildiMi).toBe(false);
});
```

- [ ] **Step 2: Başarısız olduklarını doğrula**

Run: `cd web && npx vitest run src/ui/SifreAlani.test.tsx src/pages/LoginPage.test.tsx src/pages/RegisterPage.test.tsx`
Expected: FAIL — `SifreAlani` modülü yok; "Giriş yap"/"Kayıt ol" düğmeleri ve "Şifre tekrarı" alanı yok.

- [ ] **Step 3: UI bileşenlerini yaz**

`web/src/ui/Alan.tsx`:

```tsx
import type { InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface AlanProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  etiket: string;
  ikon: LucideIcon;
  ipucu?: string;
  hata?: string;
  // Girdinin sagina bindirilen ek (orn. sifre goster dugmesi).
  sagEk?: ReactNode;
}

/**
 * Giris/kayit alani (spec, ortak auth duzeni): etiket ustte, solda sus ikonu, altta ipucu ve hata.
 * Ipucu `aria-describedby` ile girdiye baglanir.
 */
export default function Alan({ id, etiket, ikon: Ikon, ipucu, hata, sagEk, ...girdi }: AlanProps) {
  const ipucuId = ipucu ? `${id}-ipucu` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label text-fg">
        {etiket}
      </label>
      <div className="relative flex items-center">
        <Ikon aria-hidden size={20} className="pointer-events-none absolute left-3 text-muted" />
        <input
          id={id}
          aria-describedby={ipucuId}
          {...girdi}
          className={`h-12 w-full rounded-xl bg-surface-2 pl-10 text-body text-fg placeholder:text-muted/50 focus:bg-surface-3 ${
            sagEk ? 'pr-12' : 'pr-4'
          }`}
        />
        {sagEk && <div className="absolute right-0.5">{sagEk}</div>}
      </div>
      {ipucu && (
        <p id={ipucuId} className="pl-1 text-label text-muted">
          {ipucu}
        </p>
      )}
      {hata && (
        <p role="alert" className="pl-1 text-label text-danger">
          {hata}
        </p>
      )}
    </div>
  );
}
```

`web/src/ui/SifreAlani.tsx`:

```tsx
import { useState } from 'react';
import { Eye, EyeOff, Lock, type LucideIcon } from 'lucide-react';
import Alan, { type AlanProps } from './Alan';

type Props = Omit<AlanProps, 'type' | 'sagEk' | 'ikon'> & {
  ikon?: LucideIcon;
  gosterEtiketi?: string;
};

/**
 * Sifre alani + goster/gizle dugmesi (spec davranis 2). Dugmenin adi SABITTIR, durum
 * `aria-pressed` ile bildirilir (toggle button kalibi); goz ikonu durumu gorsel olarak degistirir.
 */
export default function SifreAlani({ ikon = Lock, gosterEtiketi = 'Şifreyi göster', ...alan }: Props) {
  const [gorunur, setGorunur] = useState(false);
  const GozIkonu = gorunur ? EyeOff : Eye;

  return (
    <Alan
      {...alan}
      ikon={ikon}
      type={gorunur ? 'text' : 'password'}
      sagEk={
        <button
          type="button"
          aria-label={gosterEtiketi}
          aria-pressed={gorunur}
          aria-controls={alan.id}
          onClick={() => setGorunur((g) => !g)}
          className="flex size-11 items-center justify-center rounded-lg text-muted"
        >
          <GozIkonu aria-hidden size={20} />
        </button>
      }
    />
  );
}
```

`web/src/ui/HataKutusu.tsx`:

```tsx
import { CircleAlert } from 'lucide-react';

/** Formun genel hatasi (spec): danger-bg kutu, baslik + mesaj, role=alert. */
export default function HataKutusu({ baslik, mesaj }: { baslik: string; mesaj: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-bg p-4 text-on-danger-bg">
      <CircleAlert aria-hidden size={20} className="mt-0.5 shrink-0 text-danger" />
      <div className="flex flex-col">
        <span className="text-label font-bold">{baslik}</span>
        <span className="text-body">{mesaj}</span>
      </div>
    </div>
  );
}
```

`web/src/ui/AuthLayout.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Dumbbell } from 'lucide-react';

interface Props {
  baslik: string;
  aciklama?: string;
  children: ReactNode;
  altBaglanti: ReactNode;
}

/**
 * Giris ve Kayit'in TEK ortak duzeni (spec): ustte logo karosu (PWA ikonuyla ayni motif) + GRIND +
 * slogan, ortada kart, altta gecis baglantisi. Bu ekranlarda kabuk (baslik/sekme cubugu) yok.
 */
export default function AuthLayout({ baslik, aciklama, children, altBaglanti }: Props) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-surface-3 text-accent">
          <Dumbbell aria-hidden size={28} />
        </div>
        <span className="text-title uppercase">GRIND</span>
        <p className="mt-1 text-body text-muted">Güç antrenmanı günlüğü</p>
      </div>
      <section className="flex flex-col gap-4 rounded-xl bg-surface-1 p-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-heading">{baslik}</h1>
          {aciklama && <p className="text-body text-muted">{aciklama}</p>}
        </div>
        {children}
      </section>
      <p className="mt-4 text-center text-body text-muted">{altBaglanti}</p>
    </main>
  );
}
```

- [ ] **Step 4: `web/src/pages/LoginPage.tsx` — görünüm**

İçe aktarmalara ekle:

```tsx
import { AtSign } from 'lucide-react';
import AuthLayout from '../ui/AuthLayout';
import Alan from '../ui/Alan';
import SifreAlani from '../ui/SifreAlani';
import HataKutusu from '../ui/HataKutusu';
import BirincilDugme from '../ui/BirincilDugme';
```

`return (...)` bloğunu tamamen şununla değiştir (state, doğrulama ve `gonder` AYNEN kalır):

```tsx
  return (
    <AuthLayout
      baslik="Giriş yap"
      altBaglanti={
        <>
          Hesabın yok mu?{' '}
          <Link to="/register" className="inline-flex min-h-11 items-center font-semibold text-accent-soft">
            Kayıt ol
          </Link>
        </>
      }
    >
      {genelHata && <HataKutusu baslik="Giriş başarısız" mesaj={genelHata} />}
      <form onSubmit={gonder} className="flex flex-col gap-4">
        <Alan
          id="username"
          etiket="Kullanıcı adı"
          ikon={AtSign}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={kullaniciAdi}
          onChange={(e) => setKullaniciAdi(e.target.value)}
          hata={alanHatalari.username}
        />
        <SifreAlani
          id="password"
          etiket="Şifre"
          autoComplete="current-password"
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          hata={alanHatalari.password}
        />
        <BirincilDugme type="submit" yukseklik="normal" disabled={gonderiliyor}>
          Giriş yap
        </BirincilDugme>
      </form>
    </AuthLayout>
  );
```

- [ ] **Step 5: `web/src/pages/RegisterPage.tsx` — şifre tekrarı ve görünüm**

İçe aktarmalara ekle:

```tsx
import { AtSign, LockKeyhole, UserPlus } from 'lucide-react';
import AuthLayout from '../ui/AuthLayout';
import Alan from '../ui/Alan';
import SifreAlani from '../ui/SifreAlani';
import HataKutusu from '../ui/HataKutusu';
import BirincilDugme from '../ui/BirincilDugme';
```

`const [sifre, setSifre] = useState('');` satırının ALTINA ekle:

```tsx
  const [sifreTekrari, setSifreTekrari] = useState('');
```

`alanlariDogrula` içinde şifre `if … else if …` zincirinin (72 bayt dalı dahil) HEMEN ALTINA,
`setAlanHatalari(hatalar);` satırının ÜSTÜNE ekle:

```tsx
    // Spec davranis 1: sifre sifirlama olmadigi icin kayittaki yazim hatasi hesabi kalici kilitler.
    // Sifrenin kendisi zaten hataliysa ikinci bir mesaj eklenmez; sunucuya yalnizca `password` gider.
    if (!hatalar.password && sifreTekrari !== sifre) {
      hatalar.passwordConfirm = 'Şifreler eşleşmiyor.';
    }
```

`return (...)` bloğunu tamamen şununla değiştir:

```tsx
  return (
    <AuthLayout
      baslik="Kayıt ol"
      aciklama="Ağırlıklarını ve gelişimini anlık takip etmeye başla."
      altBaglanti={
        <>
          Zaten hesabın var mı?{' '}
          <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-accent-soft">
            Giriş yap
          </Link>
        </>
      }
    >
      {genelHata && <HataKutusu baslik="Kayıt başarısız" mesaj={genelHata} />}
      <form onSubmit={gonder} className="flex flex-col gap-4">
        <Alan
          id="username"
          etiket="Kullanıcı adı"
          ikon={AtSign}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ornek_kullanici"
          ipucu="3–50 karakter (harf, rakam, _ ve -)"
          value={kullaniciAdi}
          onChange={(e) => setKullaniciAdi(e.target.value)}
          hata={alanHatalari.username}
        />
        <SifreAlani
          id="password"
          etiket="Şifre"
          autoComplete="new-password"
          ipucu="En az 8 karakter"
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          hata={alanHatalari.password}
        />
        <SifreAlani
          id="password-confirm"
          etiket="Şifre tekrarı"
          ikon={LockKeyhole}
          gosterEtiketi="Şifre tekrarını göster"
          autoComplete="new-password"
          value={sifreTekrari}
          onChange={(e) => setSifreTekrari(e.target.value)}
          hata={alanHatalari.passwordConfirm}
        />
        <BirincilDugme type="submit" yukseklik="normal" disabled={gonderiliyor}>
          <UserPlus aria-hidden size={22} />
          Kayıt ol
        </BirincilDugme>
      </form>
    </AuthLayout>
  );
```

`BILINEN_ALANLAR` DEĞİŞMEZ (`['username', 'password']`): sunucu şifre tekrarını bilmez.

- [ ] **Step 6: Testleri çalıştır**

Run: `cd web && npx vitest run src/ui/SifreAlani.test.tsx src/pages/LoginPage.test.tsx src/pages/RegisterPage.test.tsx src/App.test.tsx`
Expected: SifreAlani 1, Login 3, Register 4, App 5 test PASS. (App testindeki `/login` rotası kendi
yerel `<h1>Giriş Yap</h1>` saplamasını kullanır, `LoginPage`'e bağlı değildir — değişmez.)

- [ ] **Step 7: Tüm doğrulama ve commit**

```bash
cd web && npm run typecheck && npm run test && npm run build
git add web/src/ui web/src/pages/LoginPage.tsx web/src/pages/RegisterPage.tsx web/src/pages/LoginPage.test.tsx web/src/pages/RegisterPage.test.tsx
git commit -m "feat(web): giris ve kayit tasarimi, sifre goster ve sifre tekrari" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Expected: 70 test PASS.

---

### Task 6: Uygulama ikonu ve kurulabilirlik

> **Uygulamada değişti:** kurulu üretici 1.0.4 (`vite-plugin-pwa` 1.3'ün peer aralığı `^1.0.0`); maskable
> ve apple ikonları için yapılandırmaya `padding: 0` + `#121316` arka plan eklendi (aşağıdaki
> yapılandırma bloğu günceldir).

**Files:**
- Create: `web/public/icon.svg`, `web/pwa-assets.config.ts`
- Create (üretilir, commit edilir): `web/public/pwa-64x64.png`, `web/public/pwa-192x192.png`,
  `web/public/pwa-512x512.png`, `web/public/maskable-icon-512x512.png`,
  `web/public/apple-touch-icon-180x180.png`, `web/public/favicon.ico`
- Modify: `web/package.json` (betik), `web/vite.config.ts` (manifest ikonları), `web/index.html`
  (favicon ve apple-touch bağlantıları)

**Interfaces:**
- Consumes: Görev 1'de kurulan `@vite-pwa/assets-generator`.
- Produces: manifest'te `icons` → Chrome/Android "uygulama olarak yükle"yi sunar (spec Karar 6).

Bu görev varlık ve yapılandırmadır: davranış testi yazılmaz. Kanıt, derleme çıktısındaki manifest ve
dosyalardır; mevcut 70 test yeşil kalır.

- [ ] **Step 1: `web/public/icon.svg`'yi yaz**

Tam dolgu `bg` zemin, ortada `accent` dambıl. Yollar `lucide-react` 1.45.0 `dumbbell` ikonundan
BİREBİR (24×24 tuval, 13,333 ölçekle 320 px'e büyütülüp 96 px kaydırılarak ortalanır; dambılın uç
noktaları merkezden ~179 px'te kalır, maskable güvenli dairesinin (204 px) içindedir):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#121316"/>
  <g transform="translate(96 96) scale(13.3333)" fill="none" stroke="#ff5722" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/>
    <path d="m2.5 21.5 1.4-1.4"/>
    <path d="m20.1 3.9 1.4-1.4"/>
    <path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/>
    <path d="m9.6 14.4 4.8-4.8"/>
  </g>
</svg>
```

- [ ] **Step 2: Üretici yapılandırması ve betik**

`web/pwa-assets.config.ts`:

```ts
import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

// Bir kerelik uretim (spec Karar 6): `npm run pwa:icons` ciktilari commit edilir, derleme hattina
// girmez. minimal-2023: 64/192/512 PNG, 512 maskable, 180 apple-touch, 48 px favicon.ico.
export default defineConfig({
  preset: {
    ...preset,
    // Uygulamada eklendi: uretici maskable/apple icin %30 beyaz dolgu varsayar; spec Karar 6 tam kaplama ister.
    maskable: { ...preset.maskable, padding: 0, resizeOptions: { background: '#121316' } },
    apple: { ...preset.apple, padding: 0, resizeOptions: { background: '#121316' } },
  },
  images: ['public/icon.svg'],
});
```

`web/package.json` `scripts` içine ekle (`"lint"` satırının üstüne):

```json
    "pwa:icons": "pwa-assets-generator",
```

- [ ] **Step 3: İkonları üret**

```bash
cd web && npm run pwa:icons
ls public
```

Expected: `public/` altında `icon.svg` yanında tam şu altı dosya: `pwa-64x64.png`, `pwa-192x192.png`,
`pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`. Adlar
farklı çıkarsa DUR ve raporla (manifest bu adlara bağlı).

- [ ] **Step 4: Manifest ve `index.html`**

`web/vite.config.ts` içinde `VitePWA({` altına, `registerType` satırının hemen altına ekle:

```ts
      // Manifest'te listelenmeyen ama kabukta kullanilan ikonlar da precache'e girsin.
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
```

Aynı dosyada `// Ikonlar Gorev 6'da eklenir. Tema rengi gorsel tasarim spec'i Karar 5.` yorumunu
`// Ikonlar ve tema rengi: gorsel tasarim spec'i Karar 5 ve 6.` ile değiştir; `manifest` nesnesine
`background_color` satırının altına ekle:

```ts
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
```

`web/index.html` içinde `<meta name="theme-color" …>` satırının ALTINA ekle:

```html
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

- [ ] **Step 5: Doğrula**

```bash
cd web && npm run typecheck && npm run test && npm run build
node -e "const m=require('./dist/manifest.webmanifest');console.log(m.icons.map(i=>i.src+' '+i.sizes+' '+(i.purpose||'')).join('\n'))"
ls dist/pwa-192x192.png dist/pwa-512x512.png dist/maskable-icon-512x512.png dist/favicon.ico dist/apple-touch-icon-180x180.png
grep -c "pwa-512x512.png" dist/sw.js
```

Expected: 70 test PASS; manifest dört ikonu listeler (biri `maskable`); beş dosya `dist/`'te var; `sw.js`
512 ikonunu precache'ler. (`require` `.webmanifest` uzantısını JSON olarak okumazsa:
`node -e "console.log(JSON.parse(require('fs').readFileSync('dist/manifest.webmanifest','utf8')).icons)"`.)

- [ ] **Step 6: Commit**

```bash
git add web/public web/pwa-assets.config.ts web/package.json web/vite.config.ts web/index.html
git commit -m "feat(web): uygulama ikonu ve pwa kurulabilirligi" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7 (kontrolcü): Görsel doğrulama — Stitch ile yan yana

Görev 1–6 incelemeleri temizlendikten SONRA, final tüm-branch incelemesinden ÖNCE yapılır (spec
Riskler). Alt ajana verilmez: ekran görüntülerini kontrolcü açıp karşılaştırır. Bu görev kod
DEĞİŞTİRMEZ; bulunan sapmalar deftere yazılır ve final incelemeye girdi olur.

- [ ] **Step 1: Sunucuların çalıştığını doğrula (gerekirse başlat)**

```bash
curl -s -o /dev/null -w "api %{http_code}\n" http://localhost:5098/swagger/v1/swagger.json
curl -s -o /dev/null -w "web %{http_code}\n" http://localhost:5173/
```

Expected: ikisi de `200`. Değilse arka planda başlat: `docker compose up -d`,
`dotnet run --project src/Grind.Api` (varsayılan `http` profili — `https` profili proxy'yi 307 ile
bozar), `cd web && npm run dev`.

- [ ] **Step 2: İki geçici geliştirme kullanıcısı ve örnek veri (yalnızca yerel dev veritabanı)**

Çalışma dizini scratchpad altında `gorsel/`. Aşağıdaki betik `gorsel/hazirla.mjs` olarak yazılıp
`node gorsel/hazirla.mjs` ile çalıştırılır. Kullanıcı yoksa kaydeder (409 → giriş yapar), `gorsel_dolu`
için bugün açık oturum yoksa Stitch'teki örneğe benzer altı set ekler (tekrar çalıştırılınca yinelenen
set eklemez), her kullanıcı için Playwright `--load-storage` dosyası yazar:

```js
import { writeFileSync } from 'node:fs';

const TABAN = 'http://localhost:5173/api';
const SIFRE = 'GorselTest123';

async function json(yol, secenek = {}) {
  const yanit = await fetch(TABAN + yol, {
    ...secenek,
    headers: { 'Content-Type': 'application/json', ...(secenek.headers ?? {}) },
  });
  const govde = yanit.status === 204 ? null : await yanit.json().catch(() => null);
  return { status: yanit.status, govde };
}

async function oturumAc(kullaniciAdi) {
  const kimlik = JSON.stringify({ username: kullaniciAdi, password: SIFRE });
  let sonuc = await json('/auth/register', { method: 'POST', body: kimlik });
  if (sonuc.status === 409) sonuc = await json('/auth/login', { method: 'POST', body: kimlik });
  if (sonuc.status !== 200 && sonuc.status !== 201) throw new Error(`${kullaniciAdi}: ${sonuc.status}`);
  return sonuc.govde; // { token, expiresAtUtc, username }
}

function depoDosyasiYaz(dosya, kimlik) {
  const deger = JSON.stringify({ token: kimlik.token, expiresAtUtc: kimlik.expiresAtUtc, username: kimlik.username });
  const durum = { cookies: [], origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'grind.oturum', value: deger }] }] };
  writeFileSync(dosya, JSON.stringify(durum));
}

const dolu = await oturumAc('gorsel_dolu');
const bos = await oturumAc('gorsel_bos');
const yetki = { Authorization: `Bearer ${dolu.token}` };

const acik = await json('/sessions/open', { headers: yetki });
if (acik.status === 404) {
  const { govde: egzersizler } = await json('/exercises', { headers: yetki });
  const [a, b] = egzersizler;
  const setler = [
    [a.id, 80, 8, 2], [a.id, 82.5, 6, 1], [a.id, 85, 5, 0],
    [b.id, 100, 5, 3], [b.id, 110, 5, 2], [b.id, 110, 8, 1],
  ];
  for (const [exerciseId, weight, reps, rir] of setler) {
    await json('/sets', { method: 'POST', headers: yetki, body: JSON.stringify({ exerciseId, weight, reps, rir }) });
  }
}

depoDosyasiYaz('gorsel/dolu.json', dolu);
depoDosyasiYaz('gorsel/bos.json', bos);
console.log('hazir');
```

- [ ] **Step 3: Ekran görüntüleri (390×844)**

```bash
npx -y playwright@1 install chromium
P="npx -y playwright@1 screenshot --viewport-size=390,844 --wait-for-timeout=2500"
W=http://localhost:5173
$P --load-storage=gorsel/dolu.json $W/ gorsel/bugun.png
$P --load-storage=gorsel/dolu.json --full-page $W/ gorsel/bugun-tam.png
$P --load-storage=gorsel/bos.json $W/ gorsel/bugun-bos.png
$P --load-storage=gorsel/dolu.json $W/history gorsel/gecmis.png
$P --load-storage=gorsel/dolu.json $W/records gorsel/rekorlar.png
$P $W/login gorsel/giris.png
$P $W/register gorsel/kayit.png
S="file:///C:/coding%20projects/GRIND/docs/design/stitch"
for e in bugun bugun-bos gecmis rekorlar giris kayit; do $P --wait-for-timeout=4000 "$S/$e.html" "gorsel/stitch-$e.png"; done
```

Stitch dosyaları çalışırken internetten Tailwind CDN'ini ve fontları çeker; bu yalnızca referans
görüntüsü içindir.

- [ ] **Step 4: Karşılaştır ve deftere yaz**

Her çifti (`gorsel/<ekran>.png` ↔ `gorsel/stitch-<ekran>.png`) aç ve spec'in ilgili ekran bölümüne göre
denetle: zemin ve yüzey katmanları, yazı ölçeği, köşeler, boşluklar, `accent` yalnızca izinli yerlerde
mi, rozetler, boş durumlar, kabuk (başlık, hesap düğmesi nötr, aktif sekme). Ek kontroller:
- `bugun-tam.png`: son set ("110 kg × 8") set ekle panelinin ÜSTÜNDE görünür, altında kalmaz.
- Stitch'ten bilerek farklı olanlar (spec Karar 7 ve ekran bölümlerindeki düzeltmeler: somon yerine
  nötr hesap düğmesi, ortak auth düzeni, `Önceki` pasif görünümü…) sapma DEĞİLDİR.
- Stitch'in Geçmiş görüntüsünde ilk kart açıktır; bizde kartlar kapalı gelir — sapma değildir.

Her gerçek sapma deftere tek satır: `Gorsel: <ekran> — <sapma> — <spec maddesi>`. Bu liste final
tüm-branch incelemesine verilir.

---

### Task 8 (kontrolcü): Dokümantasyon

Final tüm-branch incelemesinden ve düzeltme dalgasından SONRA yapılır.

- [ ] **Step 1:** Test sayılarını komutla belirle, KARIŞTIRMA: frontend `cd web && npm run test`
      özet satırı; backend `[Fact]` + her `[InlineData]` sayısı (`grep` ile).
- [ ] **Step 2:** `PLAN.md`:
  - "Durum Özeti" tablosunda `F1` satırının altına
    `| F2 | Frontend görsel tasarım (Tailwind, 6 ekran) | ✅ |`.
  - `## Çalışma Kuralı` başlığının üstüne bir "Frontend Görsel Tasarım ✅" bölümü. İçeriği:
    - ne yapıldı (Tailwind v4 tokenları, Inter, lucide, kabuk, altı ekran, PWA ikonları);
    - altı davranış eki;
    - verilen kararlar (şifre göster düğmesinde sabit ad + `aria-pressed`, font yolu);
    - ayrı test sayıları;
    - devreden notlar (açık tema yok, Stitch dokümanı repoda yok, görsel regresyon testi yok).
- [ ] **Step 3:** `CLAUDE.md`:
  - "Görsel tasarım … HENÜZ yapılmadı" maddesini ve "Kısıtlar"daki "Görsel tasarıma … girme" maddesini
    kaldır.
  - Yerine: görsel tasarımın tamamlandığı; bağlayıcı kaynağın
    `docs/superpowers/specs/2026-09-12-frontend-gorsel-tasarim-design.md` olduğu; yeni ekranların
    yalnızca oradaki token setini kullandığı; yeni bir Stitch çıktısının renklerinin spec Karar 2
    eşleme tablosuyla çevrildiği; `accent` kullanım kuralının bağlayıcı olduğu.
  - Dilim 1 maddesindeki "Kapsam dışı kalanlar: görsel tasarım (PWA manifest ikonları dahil)" ifadesini
    güncelle.
- [ ] **Step 4:** Commit:

```bash
git add PLAN.md CLAUDE.md
git commit -m "docs: frontend gorsel tasarim tamamlandi" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Plan öz-incelemesi (yazım sırasında yapıldı)

- **Spec kapsamı:**

  | Spec maddesi | Görev |
  |---|---|
  | Karar 1 (Tailwind v4, CDN yok, `@apply` yok, bileşenler) | Görev 1 ve Global Constraints |
  | Karar 2 (tokenlar, `accent` kuralı) | Görev 1 `@theme` ve Global Constraints |
  | Karar 3 (Inter, latin + latin-ext, precache) | Görev 1 |
  | Karar 4 (lucide) | Görev 1 kurulum; Görev 2–5 kullanım |
  | Karar 5 (yalnızca koyu) | Görev 1 |
  | Karar 6 (PWA ikonları) | Görev 6 |
  | Karar 7 (alınmayanlar) | Görev 1 (viewport, `:focus-visible`), Görev 3 (`type="text"` alanlar, tek animasyon, durum satırı), Görev 2 (`<button>` çıkış) |
  | Karar 8 (kabuk) | Görev 2 |
  | Ekranlar | Bugün ve boş durum → Görev 3; Geçmiş ve Rekorlar → Görev 4; Giriş ve Kayıt → Görev 5 |
  | Davranış 1 (şifre tekrarı) | Görev 5 |
  | Davranış 2 (şifreyi göster) | Görev 5 |
  | Davranış 3 (çıkış menüde) | Görev 2 |
  | Davranış 4 (bitir hatası) | Görev 3 |
  | Davranış 5 (durum satırı) | Görev 3 |
  | Davranış 6 (metin) | Görev 4 |
  | Görsel doğrulama | Görev 7 |
  | Dokümanlar | Görev 8 |

- **Spec'ten bilinçli sapma (Görev 5):** şifre göster düğmesi spec'teki "değişen ad + `aria-pressed`"
  yerine sabit ad + `aria-pressed` kullanır (ikisi birlikte durumu iki kez bildirir). Kayıt'taki ikinci
  düğme "Şifre tekrarını göster" adını alır.
- **Spec güncellemesi:** spec'in Riskler bölümü, ekran görüntüsü karşılaştırmasının her ekran görevinde
  değil, ekran görevleri bittikten sonra ve final incelemeden önce tek bir kontrolcü görevi (Görev 7)
  olarak yapılacağını söyleyecek şekilde düzeltildi. Her ekran görevinin kendi incelemesi kodu spec'e
  göre denetler.
- **Adlar ve arayüzler görevler boyunca aynı:**
  - `BirincilDugme.yukseklik` ('buyuk' / 'normal');
  - `Rozet` (Görev 3'te `children`, Görev 4'te `ton` / `ikon` / `tamYuvarlak` eklenir);
  - `Hap`, `BosDurum`;
  - `SetList.varyant` (Görev 4);
  - `tamMetin` (Görev 3'te yazılır, Görev 3 ve 4 testleri kullanır);
  - `Alan` / `AlanProps` / `SifreAlani` / `HataKutusu` / `AuthLayout` (Görev 5);
  - `HesapMenusu` ve menü kimliği `hesap-menusu` (Görev 2).
- **Test sayısı ilerleyişi:** 65 → Görev 2: 66 → Görev 3: 68 → Görev 4: 68 (yalnızca güncelleme) →
  Görev 5: 70 → Görev 6: 70.
- **Dosya çakışması (sıralı, çakışma yok):**
  - `SetList.tsx` Görev 3'te yeniden yazılır, Görev 4'te `varyant` alır.
  - `Rozet.tsx` Görev 3'te oluşur, Görev 4'te genişler.
  - `HistoryPage.test.tsx` Görev 3'te (`tamMetin`) ve Görev 4'te (metinler) güncellenir.
  - `vite.config.ts` ve `index.html` Görev 1 ve Görev 6'da değişir.
- **Doğrulanmış varsayımlar** (paketlerin kendisinden okundu):
  - `@tailwindcss/vite` 4.3.3 peer aralığı `vite ^8`'i kapsıyor.
  - Tailwind v4 varsayılan köşeleri Stitch'le aynı: `rounded` 0.25rem, `-lg` 0.5rem, `-xl` 0.75rem.
  - `@fontsource-variable/inter` 5.3.0'da ayrı latin ve latin-ext `woff2` dosyaları var; `unicode-range` değerleri `wght.css`'ten.
  - Spec'teki 23 lucide ikonunun hepsi 1.45.0'da mevcut; `Dumbbell` yolları birebir.
  - `@types/react` 19.3 `popover` / `popoverTarget` tiplerini içeriyor; jsdom Popover API'yi uygulamıyor
    ve kapalı popover'ı gizliyor (uygulamada bulundu).
  - `minimal2023Preset` çıktı adları ve boyutları (64/192/512, maskable 512, apple 180, favicon 48).
- **Bilinen riskler:**
  1. `url('@fontsource-variable/…')` Vite'ta çözülmezse Görev 1 Step 6'daki yedek yol (`wght.css` +
     precache'i iki alt kümeyle sınırlama) kullanılır ve raporlanır.
  2. `@vite-pwa/assets-generator` yerel `sharp` ikilisi Windows'ta kurulamazsa Görev 1 durur ve raporlar.
  3. Görsel tasarım en kolay "yaklaşık" bırakılan iş: Görev 7'nin yan yana karşılaştırması bu yüzden
     final incelemenin girdisidir.
