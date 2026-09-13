import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { session } from './auth/session';

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
 * desen) -- App artik `useAuth()` kullaniyor (cikis dugmesi icin), bu yuzden gercek bir
 * `AuthProvider` icinde ve gercek yonlendirme ile test edilmesi gerekiyor; mock bir auth
 * context bunu dogrulayamazdi.
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
          { index: true, element: <p>Ic sayfa icerigi</p> },
          { path: 'history', element: <p>Gecmis sayfasi</p> },
          { path: 'records', element: <p>Rekorlar sayfasi</p> },
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

test('gezinme baglantilari Bugun, Gecmis ve Rekorlar sayfalarina gider', async () => {
  const kullanici = userEvent.setup();
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <RouterProvider router={testRouterOlustur()} />
      </AuthProvider>
    </QueryClientProvider>,
  );

  await screen.findByText('Ic sayfa icerigi');

  await kullanici.click(screen.getByRole('link', { name: 'Geçmiş' }));
  expect(await screen.findByText('Gecmis sayfasi')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('link', { name: 'Rekorlar' }));
  expect(await screen.findByText('Rekorlar sayfasi')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('link', { name: 'Bugün' }));
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

  expect(screen.getByRole('link', { name: 'Bugün' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Geçmiş' })).not.toHaveAttribute('aria-current');
});

test('cikis yap tiklaninca oturum kapanir ve giris ekrani gosterilir', async () => {
  const kullanici = userEvent.setup();
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <RouterProvider router={testRouterOlustur()} />
      </AuthProvider>
    </QueryClientProvider>,
  );

  await screen.findByText('Ic sayfa icerigi');

  // hidden:true sarttir: jsdom [popover]:not(:popover-open) icin display:none uyguluyor
  // (gercek tarayicidaki Popover API davranisi jsdom'da yok) -- userEvent.click bunu
  // sorunsuz tetikler (jsdom gercek hit-testing yapmaz), sadece erisilebilirlik sorgusu
  // varsayilanda gizli elemanlari eliyor.
  await kullanici.click(screen.getByRole('button', { name: 'Çıkış yap', hidden: true }));

  expect(await screen.findByRole('heading', { name: 'Giriş Yap' })).toBeInTheDocument();
});

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
  // hidden:true: yukaridaki jsdom popover notuna bakin.
  expect(menu).toContainElement(screen.getByRole('button', { name: 'Çıkış yap', hidden: true }));
});
