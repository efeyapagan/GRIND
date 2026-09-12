import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { session } from './auth/session';

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
    <AuthProvider>
      <RouterProvider router={testRouterOlustur()} />
    </AuthProvider>,
  );

  expect(await screen.findByText('Ic sayfa icerigi')).toBeInTheDocument();
});

test('gezinme baglantilari Bugun, Gecmis ve Rekorlar sayfalarina gider', async () => {
  const kullanici = userEvent.setup();
  render(
    <AuthProvider>
      <RouterProvider router={testRouterOlustur()} />
    </AuthProvider>,
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
    <AuthProvider>
      <RouterProvider router={testRouterOlustur()} />
    </AuthProvider>,
  );

  await screen.findByText('Ic sayfa icerigi');

  expect(screen.getByRole('link', { name: 'Bugün' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Geçmiş' })).not.toHaveAttribute('aria-current');
});

test('cikis yap tiklaninca oturum kapanir ve giris ekrani gosterilir', async () => {
  const kullanici = userEvent.setup();
  render(
    <AuthProvider>
      <RouterProvider router={testRouterOlustur()} />
    </AuthProvider>,
  );

  await screen.findByText('Ic sayfa icerigi');

  await kullanici.click(screen.getByRole('button', { name: 'Çıkış yap' }));

  expect(await screen.findByRole('heading', { name: 'Giriş Yap' })).toBeInTheDocument();
});
