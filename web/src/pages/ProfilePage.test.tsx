import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import { AuthProvider } from '../auth/AuthContext';
import { session } from '../auth/session';
import { PageTitleProvider } from '../ui/PageTitleContext';
import ProfilePage from './ProfilePage';

function testeOzelSorguIstemcisi(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function profilSayfasiniOlustur() {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <PageTitleProvider>
          <ProfilePage />
        </PageTitleProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function kullaniciAdiFormu() {
  return screen.getByRole('heading', { name: 'Kullanıcı adı' }).closest('section')!;
}

function sifreFormu() {
  return screen.getByRole('heading', { name: 'Şifre değiştir' }).closest('section')!;
}

beforeEach(() => {
  session.write('gecerli-token', new Date(Date.now() + 3_600_000).toISOString(), 'benimadim');
});

afterEach(() => {
  session.clear();
});

test('kullanici adi alani mevcut kullanici adiyla onceden dolu gelir', () => {
  profilSayfasiniOlustur();

  expect(within(kullaniciAdiFormu()).getByLabelText('Kullanıcı adı')).toHaveValue('benimadim');
});

test('kullanici adi degistirilince PATCH govdesi currentPassword ve newUsername tasir, basari mesaji cikar', async () => {
  let gonderilen: unknown = null;
  server.use(
    http.patch('/api/auth/me', async ({ request }) => {
      gonderilen = await request.json();
      return HttpResponse.json({
        token: 'yeni-token',
        expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
        username: 'yeniadim',
      });
    }),
  );

  const kullanici = userEvent.setup();
  profilSayfasiniOlustur();

  const form = kullaniciAdiFormu();
  await kullanici.clear(within(form).getByLabelText('Kullanıcı adı'));
  await kullanici.type(within(form).getByLabelText('Kullanıcı adı'), 'yeniadim');
  await kullanici.type(within(form).getByLabelText('Mevcut şifre'), 'eski-sifrem-123');
  await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

  expect(await within(form).findByText('Kullanıcı adın güncellendi.')).toBeInTheDocument();
  expect(gonderilen).toEqual({ currentPassword: 'eski-sifrem-123', newUsername: 'yeniadim' });
  // Basarili degisiklik sonrasi oturum YENI kullanici adiyla guncellendi (AuthContext.test.tsx'te
  // ayrica dogrulanan davranis burada uctan uca da gorunur).
  expect(session.read()?.username).toBe('yeniadim');
});

test('kullanici adi formu bos gonderilirse istek gitmez, alan hatasi gosterilir', async () => {
  let istekYapildiMi = false;
  server.use(
    http.patch('/api/auth/me', () => {
      istekYapildiMi = true;
      return HttpResponse.json({ token: 't', expiresAtUtc: new Date().toISOString(), username: 'x' });
    }),
  );

  const kullanici = userEvent.setup();
  profilSayfasiniOlustur();

  const form = kullaniciAdiFormu();
  await kullanici.clear(within(form).getByLabelText('Kullanıcı adı'));
  await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

  const hatalar = within(form).getAllByRole('alert');
  expect(hatalar.map((h) => h.textContent)).toEqual(
    expect.arrayContaining(['Kullanıcı adı gerekli.', 'Mevcut şifre gerekli.']),
  );
  expect(istekYapildiMi).toBe(false);
});

test('kullanici adi yanlis mevcut sifreyle 401 alirsa "Mevcut şifre yanlış." gosterilir, oturum dusmez', async () => {
  server.use(
    http.patch('/api/auth/me', () =>
      HttpResponse.json({ title: 'Yetkisiz', status: 401, detail: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 }),
    ),
  );

  const kullanici = userEvent.setup();
  profilSayfasiniOlustur();

  const form = kullaniciAdiFormu();
  await kullanici.type(within(form).getByLabelText('Mevcut şifre'), 'yanlis-sifre');
  await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

  expect(await within(form).findByText('Mevcut şifre yanlış.')).toBeInTheDocument();
  expect(session.read()?.token).toBe('gecerli-token');
});

test('baskasina ait kullanici adiyla 409 donerse genel hata gosterilir', async () => {
  server.use(
    http.patch('/api/auth/me', () =>
      HttpResponse.json(
        { title: 'Çakışma', status: 409, detail: "'baskasi' kullanıcı adı zaten alınmış." },
        { status: 409 },
      ),
    ),
  );

  const kullanici = userEvent.setup();
  profilSayfasiniOlustur();

  const form = kullaniciAdiFormu();
  await kullanici.clear(within(form).getByLabelText('Kullanıcı adı'));
  await kullanici.type(within(form).getByLabelText('Kullanıcı adı'), 'baskasi');
  await kullanici.type(within(form).getByLabelText('Mevcut şifre'), 'eski-sifrem-123');
  await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

  expect(await within(form).findByText("'baskasi' kullanıcı adı zaten alınmış.")).toBeInTheDocument();
});

test('sifre degistirilince PATCH govdesi currentPassword ve newPassword tasir, alanlar temizlenir', async () => {
  let gonderilen: unknown = null;
  server.use(
    http.patch('/api/auth/me', async ({ request }) => {
      gonderilen = await request.json();
      return HttpResponse.json({
        token: 'yeni-token',
        expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
        username: 'benimadim',
      });
    }),
  );

  const kullanici = userEvent.setup();
  profilSayfasiniOlustur();

  const form = sifreFormu();
  await kullanici.type(within(form).getByLabelText('Mevcut şifre'), 'eski-sifrem-123');
  await kullanici.type(within(form).getByLabelText('Yeni şifre'), 'yeni-sifrem-456');
  await kullanici.type(within(form).getByLabelText('Yeni şifre tekrarı'), 'yeni-sifrem-456');
  await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

  expect(await within(form).findByText('Şifren güncellendi.')).toBeInTheDocument();
  expect(gonderilen).toEqual({ currentPassword: 'eski-sifrem-123', newPassword: 'yeni-sifrem-456' });
  expect(within(form).getByLabelText('Mevcut şifre')).toHaveValue('');
  expect(within(form).getByLabelText('Yeni şifre')).toHaveValue('');
  expect(within(form).getByLabelText('Yeni şifre tekrarı')).toHaveValue('');
});

test('yeni sifre tekrari eslesmezse istek gitmez, alan hatasi gosterilir', async () => {
  let istekYapildiMi = false;
  server.use(
    http.patch('/api/auth/me', () => {
      istekYapildiMi = true;
      return HttpResponse.json({ token: 't', expiresAtUtc: new Date().toISOString(), username: 'x' });
    }),
  );

  const kullanici = userEvent.setup();
  profilSayfasiniOlustur();

  const form = sifreFormu();
  await kullanici.type(within(form).getByLabelText('Mevcut şifre'), 'eski-sifrem-123');
  await kullanici.type(within(form).getByLabelText('Yeni şifre'), 'yeni-sifrem-456');
  await kullanici.type(within(form).getByLabelText('Yeni şifre tekrarı'), 'baska-bir-sey');
  await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

  expect(within(form).getByRole('alert')).toHaveTextContent('Şifreler eşleşmiyor.');
  expect(istekYapildiMi).toBe(false);
});

test('kisa yeni sifre (8 karakterden az) istemcide reddedilir', async () => {
  let istekYapildiMi = false;
  server.use(
    http.patch('/api/auth/me', () => {
      istekYapildiMi = true;
      return HttpResponse.json({ token: 't', expiresAtUtc: new Date().toISOString(), username: 'x' });
    }),
  );

  const kullanici = userEvent.setup();
  profilSayfasiniOlustur();

  const form = sifreFormu();
  await kullanici.type(within(form).getByLabelText('Mevcut şifre'), 'eski-sifrem-123');
  await kullanici.type(within(form).getByLabelText('Yeni şifre'), 'kisa');
  await kullanici.type(within(form).getByLabelText('Yeni şifre tekrarı'), 'kisa');
  await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

  expect(within(form).getByRole('alert')).toHaveTextContent(/en az 8 karakter/i);
  expect(istekYapildiMi).toBe(false);
});

test('sifre formu yanlis mevcut sifreyle 401 alirsa oturum dusmeden hata gosterilir', async () => {
  server.use(
    http.patch('/api/auth/me', () =>
      HttpResponse.json({ title: 'Yetkisiz', status: 401, detail: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 }),
    ),
  );

  const kullanici = userEvent.setup();
  profilSayfasiniOlustur();

  const form = sifreFormu();
  await kullanici.type(within(form).getByLabelText('Mevcut şifre'), 'yanlis');
  await kullanici.type(within(form).getByLabelText('Yeni şifre'), 'yeni-sifrem-456');
  await kullanici.type(within(form).getByLabelText('Yeni şifre tekrarı'), 'yeni-sifrem-456');
  await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

  expect(await within(form).findByText('Mevcut şifre yanlış.')).toBeInTheDocument();
  expect(session.read()?.token).toBe('gecerli-token');
});

test('iki form birbirinden bagimsizdir: biri gonderilirken digeri etkilenmez', async () => {
  const govdeler: unknown[] = [];
  server.use(
    http.patch('/api/auth/me', async ({ request }) => {
      govdeler.push(await request.json());
      return HttpResponse.json({
        token: 'yeni-token',
        expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
        username: 'benimadim',
      });
    }),
  );

  const kullanici = userEvent.setup();
  profilSayfasiniOlustur();

  const sForm = sifreFormu();
  await kullanici.type(within(sForm).getByLabelText('Mevcut şifre'), 'eski-sifrem-123');
  await kullanici.type(within(sForm).getByLabelText('Yeni şifre'), 'yeni-sifrem-456');
  await kullanici.type(within(sForm).getByLabelText('Yeni şifre tekrarı'), 'yeni-sifrem-456');
  await kullanici.click(within(sForm).getByRole('button', { name: 'Kaydet' }));

  await within(sForm).findByText('Şifren güncellendi.');
  // Kullanici adi formu HIC dokunulmadi -- gonderilen tek govde sifre formununki, kullanici
  // adi alani mevcut adiyla ayni kaldi.
  expect(govdeler).toEqual([{ currentPassword: 'eski-sifrem-123', newPassword: 'yeni-sifrem-456' }]);
  expect(within(kullaniciAdiFormu()).getByLabelText('Kullanıcı adı')).toHaveValue('benimadim');
});
