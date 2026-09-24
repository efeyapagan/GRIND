import { render, screen, waitFor, within } from '@testing-library/react';
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

function sifreFormu() {
  return screen.getByRole('heading', { name: 'Şifre değiştir' }).closest('section')!;
}

/** #117: haftalik hedefin guncel degeri takvim ucundan gelir; istenen araliklar sirasiyla kaydedilir. */
function takvimSunucusu(weeklyTargetDays: number | null) {
  const araliklar: string[] = [];
  server.use(
    http.get('/api/stats/calendar', ({ request }) => {
      const url = new URL(request.url);
      const from = url.searchParams.get('From');
      const to = url.searchParams.get('To');
      araliklar.push(`${from}..${to}`);
      return HttpResponse.json({
        from,
        to,
        days: [],
        trainedDayCount: 0,
        currentWeekStreak: 0,
        longestWeekStreak: 0,
        thisWeekTrainedDays: 0,
        weeklyTargetDays,
        currentTargetStreak: weeklyTargetDays === null ? null : 0,
      });
    }),
  );
  return araliklar;
}

/** GizlilikSeviyesiSecici (#294) `GET /api/profile` okur; varsayılan seviye Kısıtlı. */
function profilSunucusu(privacyLevel: 'Acik' | 'Kisitli' | 'Gizli' = 'Kisitli') {
  server.use(
    http.get('/api/profile', () =>
      HttpResponse.json({
        username: 'benimadim',
        displayName: null,
        birthDate: null,
        age: null,
        hasAvatar: false,
        avatarVersion: null,
        privacyLevel,
      }),
    ),
  );
}

beforeEach(() => {
  session.write('gecerli-token', new Date(Date.now() + 3_600_000).toISOString(), 'benimadim');
  takvimSunucusu(null);
  profilSunucusu();
});

afterEach(() => {
  session.clear();
});

/** Issue #119 kullanici karari: kullanici adi artik DUZENLENEMEZ, sadece goruntulenir. */
test('kullanici adi duzenlenemez bir metin olarak gorunur', () => {
  profilSayfasiniOlustur();

  expect(screen.getByText('benimadim')).toBeInTheDocument();
  expect(screen.queryByLabelText('Kullanıcı adı')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Kullanıcı adı' })).not.toBeInTheDocument();
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

test('haftalik hedef sunucunun degeriyle gelir; secim PUT gonderir ve deger yeniden istenir (#97, #117)', async () => {
  const araliklar = takvimSunucusu(4);
  const govdeler: unknown[] = [];
  server.use(
    http.put('/api/settings/weekly-target', async ({ request }) => {
      govdeler.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
  );
  profilSayfasiniOlustur();

  const secici = await screen.findByLabelText('Haftalık hedef');
  await waitFor(() => expect(secici).toHaveValue('4'));

  await userEvent.selectOptions(secici, '');

  await waitFor(() => expect(govdeler).toEqual([{ weeklyTargetDays: null }]));
  await waitFor(() => expect(araliklar).toHaveLength(2));
});

test('gizlilik secimi PUT gonderir ve profil yeniden istenir (#294)', async () => {
  profilSunucusu('Acik');
  const govdeler: unknown[] = [];
  server.use(
    http.put('/api/settings/privacy-level', async ({ request }) => {
      govdeler.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
  );
  profilSayfasiniOlustur();

  const secici = await screen.findByLabelText('Gizlilik seviyesi');
  await waitFor(() => expect(secici).toHaveValue('Acik'));

  await userEvent.selectOptions(secici, 'Gizli');

  await waitFor(() => expect(govdeler).toEqual([{ privacyLevel: 'Gizli' }]));
});

/** Issue #119/#120: Cikis yap ust kabuktaki hesap menusunden buraya (Hesap sekmesinin en altina) tasindi. */
test('cikis yap tiklaninca oturum kapanir', async () => {
  const kullanici = userEvent.setup();
  profilSayfasiniOlustur();

  expect(session.read()).not.toBeNull();

  await kullanici.click(screen.getByRole('button', { name: 'Çıkış yap' }));

  expect(session.read()).toBeNull();
});
