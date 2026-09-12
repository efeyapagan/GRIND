import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import { AuthProvider } from '../auth/AuthContext';
import { session } from '../auth/session';
import RegisterPage from './RegisterPage';

function testeOzelSorguIstemcisi(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function kayitSayfasiniOlustur() {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
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

test('kullanici adi deseni istemcide dogrulanir: istek gitmez, alan hatasi gosterilir', async () => {
  let istekYapildiMi = false;
  server.use(
    http.post('/api/auth/register', () => {
      istekYapildiMi = true;
      return HttpResponse.json({ token: 't', expiresAtUtc: new Date().toISOString(), username: 'x' });
    }),
  );

  const kullanici = userEvent.setup();
  kayitSayfasiniOlustur();

  // "ab" -- 3 karakterden kisa, ^[a-zA-Z0-9_-]{3,50}$ desenini ihlal eder.
  await kullanici.type(screen.getByLabelText('Kullanıcı adı'), 'ab');
  await kullanici.type(screen.getByLabelText('Şifre'), 'gecerlisifre');
  await kullanici.click(screen.getByRole('button', { name: 'Kayıt Ol' }));

  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(istekYapildiMi).toBe(false);
});

test('72 bayti asan sifre istemcide reddedilir: istek gitmez', async () => {
  let istekYapildiMi = false;
  server.use(
    http.post('/api/auth/register', () => {
      istekYapildiMi = true;
      return HttpResponse.json({ token: 't', expiresAtUtc: new Date().toISOString(), username: 'x' });
    }),
  );

  const kullanici = userEvent.setup();
  kayitSayfasiniOlustur();

  // 72 adet 'g' (2 baytlik UTF-8 karakteri) = 144 bayt -- 8+ karakter oldugu icin min-karakter
  // kuralini gecer, sadece bayt siniri ihlal edilir.
  const cokBaytliSifre = 'ğ'.repeat(72);
  await kullanici.type(screen.getByLabelText('Kullanıcı adı'), 'gecerli_kullanici');
  await kullanici.type(screen.getByLabelText('Şifre'), cokBaytliSifre);
  await kullanici.click(screen.getByRole('button', { name: 'Kayıt Ol' }));

  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(istekYapildiMi).toBe(false);
});

test('409: kullanici adi alinmis hatasi sunucu mesajiyla gosterilir', async () => {
  server.use(
    http.post('/api/auth/register', () =>
      HttpResponse.json({ detail: 'Kullanıcı adı alınmış.', status: 409 }, { status: 409 }),
    ),
  );

  const kullanici = userEvent.setup();
  kayitSayfasiniOlustur();

  await kullanici.type(screen.getByLabelText('Kullanıcı adı'), 'mevcut_kullanici');
  await kullanici.type(screen.getByLabelText('Şifre'), 'gecerlisifre');
  await kullanici.click(screen.getByRole('button', { name: 'Kayıt Ol' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Kullanıcı adı alınmış.');
  expect(session.read()).toBeNull();
});
