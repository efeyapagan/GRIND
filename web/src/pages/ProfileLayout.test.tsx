import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { server } from '../test/msw';
import { AuthProvider } from '../auth/AuthContext';
import { session } from '../auth/session';
import ProfileLayout from './ProfileLayout';

/**
 * Issue #283: Profil, Instagram profili gibi bir başlık (fotoğraf, ad, yaş, üç sayaç, iki düğme) ve
 * altında ikonlu sekmelerden oluşur. Gerçek alt sayfalar yerine yer tutucular kullanılır -- burada
 * sınanan `ProfileLayout`'ın kendisi, sekmelerin içeriği değil.
 */
function profiliOlustur(baslangicYolu = '/profile') {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
    >
      <AuthProvider>
        <MemoryRouter initialEntries={[baslangicYolu]}>
          <Routes>
            <Route path="/profile" element={<ProfileLayout />}>
              <Route index element={<Navigate to="history" replace />} />
              <Route path="history" element={<p>Geçmiş içeriği</p>} />
              <Route path="records" element={<p>Rekorlar içeriği</p>} />
              <Route path="measurements" element={<p>Ölçüler içeriği</p>} />
            </Route>
            <Route path="/profile/edit" element={<p>Düzenleme içeriği</p>} />
            <Route path="/profile/account" element={<p>Hesap ayarları içeriği</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  session.write('gecerli-token', new Date(Date.now() + 3_600_000).toISOString(), 'efeypgn');
  server.use(
    http.get('/api/profile', () =>
      HttpResponse.json({
        username: 'efeypgn',
        displayName: 'Efe Yapağan',
        birthDate: '2001-05-04',
        age: 25,
        hasAvatar: false,
        avatarVersion: null,
      }),
    ),
    http.get('/api/users/efeypgn/profile', () =>
      HttpResponse.json({
        username: 'efeypgn',
        displayName: 'Efe Yapağan',
        age: 25,
        hasAvatar: false,
        avatarVersion: null,
        friendCount: 3,
        followerCount: 12,
        followingCount: 7,
        relation: 'Self',
      }),
    ),
  );
});

afterEach(() => {
  session.clear();
});

/** Sıra kullanıcı kararıdır (#283); Hesap artık sekme değil, başlıktaki "Hesap ayarları" düğmesi. */
test('sekmeler soldan saga Gecmis, Rekorlar, Olculer sirasinda gorunur, Hesap sekmesi yok', async () => {
  profiliOlustur();

  await screen.findByText('Geçmiş içeriği');

  const sekmeCubugu = screen.getByRole('navigation', { name: 'Profil sekmeleri' });
  const etiketler = within(sekmeCubugu)
    .getAllByRole('link')
    .map((link) => link.getAttribute('aria-label') ?? link.textContent);

  expect(etiketler).toEqual(['Geçmiş', 'Rekorlar', 'Ölçüler']);
});

test('baslik kullanici adini, gorunen ismi, yasi ve sunucudan gelen uc sayaci gosterir', async () => {
  profiliOlustur();

  expect(await screen.findByText('Efe Yapağan')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'efeypgn' })).toBeInTheDocument();
  expect(screen.getByText('25 yaş')).toBeInTheDocument();

  const sayaclar = screen.getByRole('list', { name: 'Profil sayaçları' });
  expect(within(sayaclar).getAllByRole('listitem').map((oge) => oge.textContent)).toEqual([
    '3Arkadaşlar',
    '12Takipçiler',
    '7Takip edilenler',
  ]);
});

test('fotograf yoksa gorunen ismin bas harfi gosterilir', async () => {
  profiliOlustur();

  expect(await screen.findByText('E')).toBeInTheDocument();
  expect(screen.queryByRole('img', { name: 'Profil fotoğrafı' })).not.toBeInTheDocument();
});

test('Profili duzenle dugmesi duzenleme ekranini acar', async () => {
  const kullanici = userEvent.setup();
  profiliOlustur();

  await kullanici.click(await screen.findByRole('link', { name: 'Profili düzenle' }));
  expect(await screen.findByText('Düzenleme içeriği')).toBeInTheDocument();
});

test('Hesap ayarlari dugmesi hesap ekranini acar', async () => {
  const kullanici = userEvent.setup();
  profiliOlustur();

  await kullanici.click(await screen.findByRole('link', { name: 'Hesap ayarları' }));
  expect(await screen.findByText('Hesap ayarları içeriği')).toBeInTheDocument();
});
