import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { server } from '../test/msw';
import { AuthProvider } from '../auth/AuthContext';
import { session } from '../auth/session';
import { PageTitleProvider } from '../ui/PageTitleContext';
import ProfiliDuzenlePage from './ProfiliDuzenlePage';

/**
 * jsdom'da canvas yok: küçültme ayrı bir modülde durur ve burada sahtelenir. Sınanan, seçilen
 * dosyanın küçültülmüş hâlinin yüklendiği -- küçültmenin kendisi değil (o `kareKirpma` testinde).
 */
vi.mock('../lib/fotografiKucult', () => ({
  fotografiKucult: vi.fn(async () => new Blob(['kucuk'], { type: 'image/jpeg' })),
}));

function profilYaniti(gecersizler: Record<string, unknown> = {}) {
  return {
    username: 'efeypgn',
    displayName: 'Efe Yapağan',
    birthDate: '2001-05-04',
    age: 25,
    hasAvatar: false,
    avatarVersion: null,
    ...gecersizler,
  };
}

function ekraniOlustur() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
    >
      <AuthProvider>
        <PageTitleProvider>
          <MemoryRouter initialEntries={['/profile/edit']}>
            <Routes>
              <Route path="/profile/edit" element={<ProfiliDuzenlePage />} />
              <Route path="/profile/history" element={<p>Profil</p>} />
            </Routes>
          </MemoryRouter>
        </PageTitleProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  session.write('gecerli-token', new Date(Date.now() + 3_600_000).toISOString(), 'efeypgn');
});

afterEach(() => {
  session.clear();
  vi.unstubAllGlobals();
});

test('form mevcut degerlerle dolar; Kaydet isim ve dogum tarihini PUT eder ve Profile doner', async () => {
  let govde: unknown;
  server.use(
    http.get('/api/profile', () => HttpResponse.json(profilYaniti())),
    http.put('/api/profile', async ({ request }) => {
      govde = await request.json();
      return HttpResponse.json(profilYaniti({ displayName: 'Efe Y.', birthDate: '2000-01-02', age: 26 }));
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  const isim = await screen.findByLabelText('Görünen isim');
  expect(isim).toHaveValue('Efe Yapağan');
  expect(screen.getByLabelText('Doğum tarihi')).toHaveValue('2001-05-04');

  await kullanici.clear(isim);
  await kullanici.type(isim, 'Efe Y.');
  await kullanici.clear(screen.getByLabelText('Doğum tarihi'));
  await kullanici.type(screen.getByLabelText('Doğum tarihi'), '2000-01-02');
  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Profil')).toBeInTheDocument();
  expect(govde).toEqual({ displayName: 'Efe Y.', birthDate: '2000-01-02' });
});

/** Boş alan "temizle" demektir: sunucu `null`'u alanı silmek olarak yorumlar (#280). */
test('bos birakilan dogum tarihi null olarak gonderilir', async () => {
  let govde: unknown;
  server.use(
    http.get('/api/profile', () => HttpResponse.json(profilYaniti())),
    http.put('/api/profile', async ({ request }) => {
      govde = await request.json();
      return HttpResponse.json(profilYaniti({ birthDate: null, age: null }));
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await kullanici.clear(await screen.findByLabelText('Doğum tarihi'));
  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  await screen.findByText('Profil');
  expect(govde).toEqual({ displayName: 'Efe Yapağan', birthDate: null });
});

/**
 * jsdom'un FormData/Blob'u Node'un fetch'iyle serileştirilemiyor ("_buffer" hatası) -- yükleme isteği
 * MSW'ye varmadan `fetch` sınırında yakalanır; diğer istekler MSW'ye gider.
 */
test('secilen fotograf kucultulup multipart file alaniyla yuklenir', async () => {
  let yuklenen: FormDataEntryValue | null = null;
  const gercekFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (adres: RequestInfo | URL, init?: RequestInit) => {
    if (String(adres).endsWith('/profile/avatar') && init?.method === 'PUT') {
      yuklenen = (init.body as FormData).get('file');
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return gercekFetch(adres, init);
  });
  server.use(http.get('/api/profile', () => HttpResponse.json(profilYaniti())));
  const kullanici = userEvent.setup();
  ekraniOlustur();

  const secici = await screen.findByLabelText('Fotoğraf seç');
  await kullanici.upload(secici, new File(['buyuk'], 'ben.png', { type: 'image/png' }));

  await vi.waitFor(() => expect(yuklenen).not.toBeNull());
  expect((yuklenen as unknown as File).type).toBe('image/jpeg');
});

test('fotograf varsa Fotografi kaldir DELETE gonderir', async () => {
  let silindi = false;
  server.use(
    http.get('/api/profile', () => HttpResponse.json(profilYaniti({ hasAvatar: true, avatarVersion: 1 }))),
    http.get('/api/users/efeypgn/avatar', () => new HttpResponse(new Blob(['x'], { type: 'image/jpeg' }))),
    http.delete('/api/profile/avatar', () => {
      silindi = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Fotoğrafı kaldır' }));

  await vi.waitFor(() => expect(silindi).toBe(true));
});
