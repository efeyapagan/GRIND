import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { session } from './auth/session';
import { usePageTitle } from './ui/PageTitleContext';

/** Gercek bir sayfa gibi kendi basligini bildirir (issue #65) -- placeholder `<p>`lerden farkli. */
function SayfaGovdesi({ baslik, metin }: { baslik: string; metin: string }) {
  usePageTitle(baslik);
  return <p>{metin}</p>;
}

/**
 * `AuthProvider` artik (I1 fix) `useQueryClient()` kullaniyor (cikista onbellegi temizlemek
 * icin) -- bu yuzden gercek uygulamadaki gibi (main.tsx) HER ZAMAN bir `QueryClientProvider`
 * icinde render edilmeli, aksi halde context bulunamaz hatasi firlar.
 */
function testeOzelSorguIstemcisi(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

/**
 * Gercek uygulamadaki route agacini taklit eder (bkz. `auth/ProtectedRoute.test.tsx`'teki ayni
 * desen). Issue #119/#120: alt menu Ana Sayfa · (+) · Profil oldu -- rotalar buna gore.
 */
function testRouterOlustur() {
  return createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <SayfaGovdesi baslik="Ana sayfa" metin="Ic sayfa icerigi" /> },
          { path: 'antrenman', element: <SayfaGovdesi baslik="Antrenman başlat" metin="Antrenman sayfasi" /> },
          { path: 'profile', element: <SayfaGovdesi baslik="Hesap" metin="Profil sayfasi" /> },
        ],
      },
      { path: '/login', element: <h1>Giriş Yap</h1> },
    ],
    { initialEntries: ['/'] },
  );
}

beforeEach(() => {
  // Korumali alan bir oturum gerektirir -- App bilesenini gormek icin gecerli bir oturum sart.
  session.write('gecerli-token', new Date(Date.now() + 3_600_000).toISOString(), 'efe');
});

afterEach(() => {
  session.clear();
});

test('App, ic route icerigini Outlet ile gosterir', async () => {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <RouterProvider router={testRouterOlustur()} />
      </AuthProvider>
    </QueryClientProvider>,
  );

  expect(await screen.findByText('Ic sayfa icerigi')).toBeInTheDocument();
});

test('gezinme baglantilari Ana sayfa, Antrenman ve Profil sayfalarina gider', async () => {
  const kullanici = userEvent.setup();
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <RouterProvider router={testRouterOlustur()} />
      </AuthProvider>
    </QueryClientProvider>,
  );

  await screen.findByText('Ic sayfa icerigi');

  await kullanici.click(screen.getByRole('link', { name: 'Antrenman başlat' }));
  expect(await screen.findByText('Antrenman sayfasi')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('link', { name: 'Profil' }));
  expect(await screen.findByText('Profil sayfasi')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('link', { name: 'Ana sayfa' }));
  expect(await screen.findByText('Ic sayfa icerigi')).toBeInTheDocument();
});

test('aktif sayfanin baglantisi aria-current=page tasir', async () => {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <RouterProvider router={testRouterOlustur()} />
      </AuthProvider>
    </QueryClientProvider>,
  );

  await screen.findByText('Ic sayfa icerigi');

  expect(screen.getByRole('link', { name: 'Ana sayfa' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Profil' })).not.toHaveAttribute('aria-current');
});

test('ust kabuktaki baslik o an hangi ekranda oldugumuzu gosterir ve gezinince gunceller (issue #65)', async () => {
  const kullanici = userEvent.setup();
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <RouterProvider router={testRouterOlustur()} />
      </AuthProvider>
    </QueryClientProvider>,
  );

  await screen.findByText('Ic sayfa icerigi');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ana sayfa');

  await kullanici.click(screen.getByRole('link', { name: 'Profil' }));
  await screen.findByText('Profil sayfasi');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hesap');
});

/**
 * Issue #119/#120: hesap menusu kaldirildi. #194: sag ustte "GRIND" yazisi ve HEMEN SOLUNDA tema
 * dugmesi var -- tema secimi Profil'den buraya tasindi.
 */
test('sag ustte GRIND yazisi ve hemen solunda tema dugmesi var, hesap dugmesi yok', async () => {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <RouterProvider router={testRouterOlustur()} />
      </AuthProvider>
    </QueryClientProvider>,
  );

  await screen.findByText('Ic sayfa icerigi');

  const ustKabuk = screen.getByRole('banner');
  const temaDugmesi = within(ustKabuk).getByRole('button', { name: /temaya geç$/ });
  const grind = within(ustKabuk).getByText('GRIND');
  // DOM sirasinda dugme GRIND'den ONCE gelir, yani gorsel olarak solunda durur.
  expect(temaDugmesi.compareDocumentPosition(grind) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Hesap menüsü' })).not.toBeInTheDocument();
  // Sol tarafta artik "GRIND" DEGIL, sayfa basligi var.
  expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('GRIND');
});

/** Issue #120: "+" HER ZAMAN /antrenman'a gider -- durum kontrolu (acik oturum var mi) sayfanin kendi isi. */
test('artı dugmesi antrenman sayfasina gider', async () => {
  const kullanici = userEvent.setup();
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <RouterProvider router={testRouterOlustur()} />
      </AuthProvider>
    </QueryClientProvider>,
  );

  await screen.findByText('Ic sayfa icerigi');

  await kullanici.click(screen.getByRole('link', { name: 'Antrenman başlat' }));

  expect(await screen.findByText('Antrenman sayfasi')).toBeInTheDocument();
});
