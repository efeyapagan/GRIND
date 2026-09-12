import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { session } from './session';

/**
 * Gercek uygulamadaki route agacini taklit eden minimal bir test router'i: '/' korumali,
 * '/login' korumasiz, '/onceki' ise "korumali sayfadan ONCE ziyaret edilmis" bir sayfayi
 * temsil eder (asagidaki replace testinde kullanilir).
 */
function korumaliRouterOlustur(initialEntries: string[], initialIndex: number) {
  return createMemoryRouter(
    [
      { path: '/onceki', element: <p>ONCEKI SAYFA</p> },
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <p>KORUMALI SAYFA</p>
          </ProtectedRoute>
        ),
      },
      { path: '/login', element: <p>GIRIS SAYFASI</p> },
    ],
    { initialEntries, initialIndex },
  );
}

beforeEach(() => {
  session.clear();
});

test('oturum yoksa korumali sayfa yerine giris ekrani gosterilir', async () => {
  const router = korumaliRouterOlustur(['/'], 0);
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );

  expect(await screen.findByText('GIRIS SAYFASI')).toBeInTheDocument();
  expect(screen.queryByText('KORUMALI SAYFA')).not.toBeInTheDocument();
});

test('oturum varsa korumali sayfa gosterilir', async () => {
  session.write('gecerli-token', new Date(Date.now() + 3_600_000).toISOString(), 'efe');
  const router = korumaliRouterOlustur(['/'], 0);
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );

  expect(await screen.findByText('KORUMALI SAYFA')).toBeInTheDocument();
  expect(screen.queryByText('GIRIS SAYFASI')).not.toBeInTheDocument();
});

test('yonlendirme replace ile yapilir: bir adim geri gidince giris dongude kalinmaz, onceki sayfaya donulur', async () => {
  // Gecmis: ['/onceki', '/'] -- '/' korumali ve oturum yok, bu yuzden ProtectedRoute
  // '/' girdisini REPLACE ile '/login'e cevirir (push DEGIL). Eger biri "replace"i kaldirirsa,
  // gecmis ['/onceki', '/', '/login'] olur; bir adim geri gitmek '/'e doner, ProtectedRoute
  // orada TEKRAR yonlendirir ve kullanici giris ekraninda "dongude" kalir -- asla 'ONCEKI
  // SAYFA'ya ulasamaz. Bu test tam olarak bu farki gozlemliyor: replace kaldirilirsa kirilir.
  const router = korumaliRouterOlustur(['/onceki', '/'], 1);
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );

  await screen.findByText('GIRIS SAYFASI');

  router.navigate(-1);

  expect(await screen.findByText('ONCEKI SAYFA')).toBeInTheDocument();
  expect(screen.queryByText('GIRIS SAYFASI')).not.toBeInTheDocument();
});
