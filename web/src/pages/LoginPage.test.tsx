import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import { AuthProvider } from '../auth/AuthContext';
import { session } from '../auth/session';
import LoginPage from './LoginPage';

function testeOzelSorguIstemcisi(): QueryClient {
  // Retry kapali -- basarisiz bir istek test zaman asimina kadar yeniden denenmesin (Task 3 kurali).
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function girisSayfasiniOlustur() {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<p>ANA SAYFA</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  session.clear();
});

test('basarili giris: token saklanir ve ana sayfaya yonlendirilir', async () => {
  server.use(
    http.post('/api/auth/login', () =>
      HttpResponse.json({
        token: 'jwt-token',
        expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
        username: 'efe',
      }),
    ),
  );

  const kullanici = userEvent.setup();
  girisSayfasiniOlustur();

  await kullanici.type(screen.getByLabelText('Kullanıcı adı'), 'efe');
  await kullanici.type(screen.getByLabelText('Şifre'), 'sifre1234');
  await kullanici.click(screen.getByRole('button', { name: 'Giriş yap' }));

  await waitFor(() => expect(screen.getByText('ANA SAYFA')).toBeInTheDocument());
  expect(session.read()).toMatchObject({ token: 'jwt-token', username: 'efe' });
});

test('401: notr hata mesaji gosterilir ve alanlar temizlenmez', async () => {
  server.use(
    http.post('/api/auth/login', () =>
      HttpResponse.json({ title: 'Yetkisiz', status: 401 }, { status: 401 }),
    ),
  );

  const kullanici = userEvent.setup();
  girisSayfasiniOlustur();

  await kullanici.type(screen.getByLabelText('Kullanıcı adı'), 'efe');
  await kullanici.type(screen.getByLabelText('Şifre'), 'yanlissifre');
  await kullanici.click(screen.getByRole('button', { name: 'Giriş yap' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Kullanıcı adı veya şifre hatalı.');
  expect(screen.getByLabelText('Kullanıcı adı')).toHaveValue('efe');
  expect(screen.getByLabelText('Şifre')).toHaveValue('yanlissifre');
  expect(session.read()).toBeNull();
});

test('bos alanlarla gonderim: sunucuya istek gitmez, alan hatasi gosterilir', async () => {
  let istekYapildiMi = false;
  server.use(
    http.post('/api/auth/login', () => {
      istekYapildiMi = true;
      return HttpResponse.json({ token: 't', expiresAtUtc: new Date().toISOString(), username: 'x' });
    }),
  );

  const kullanici = userEvent.setup();
  girisSayfasiniOlustur();

  await kullanici.click(screen.getByRole('button', { name: 'Giriş yap' }));

  const hatalar = await screen.findAllByRole('alert');
  expect(hatalar.length).toBeGreaterThan(0);
  expect(istekYapildiMi).toBe(false);
});
