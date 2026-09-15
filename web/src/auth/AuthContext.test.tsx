import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../test/msw';
import { AuthProvider, useAuth } from './AuthContext';
import { session } from './session';
import { useRecords } from '../api/queries';
import type { components } from '../api/schema';

type ExerciseRecordResponse = components['schemas']['ExerciseRecordResponse'];

function ornekRekor(gecersizler: Partial<ExerciseRecordResponse> = {}): ExerciseRecordResponse {
  return {
    exerciseId: 1,
    exerciseName: 'ornek',
    bestWeight: 100,
    bestWeightReps: 5,
    bestWeightAt: new Date().toISOString(),
    bestReps: 5,
    bestRepsWeight: 100,
    bestRepsAt: new Date().toISOString(),
    ...gecersizler,
  };
}

/**
 * Gercek uygulamadaki bir veri ekranini (Rekorlar) temsil eden minimal bilesen -- `isAuthenticated`
 * kapisinin ARDINDA render edilir, tam olarak router'daki `ProtectedRoute` gibi.
 */
function VeriEkrani() {
  const { data, isLoading } = useRecords();
  return (
    <div>
      {isLoading && <p>Yükleniyor...</p>}
      {data?.map((rekor) => <p key={rekor.exerciseId}>{rekor.exerciseName}</p>)}
    </div>
  );
}

function TestUygulamasi() {
  const { isAuthenticated, username, logout, login, updateProfile } = useAuth();
  const [profilHatasi, setProfilHatasi] = useState<string | null>(null);

  return (
    <div>
      <p>Kullanıcı: {username ?? 'yok'}</p>
      <button type="button" onClick={() => logout()}>
        Çıkış
      </button>
      <button
        type="button"
        onClick={() => {
          void login('kullaniciB', 'sifreB12345');
        }}
      >
        Giriş B
      </button>
      <button
        type="button"
        onClick={() => {
          setProfilHatasi(null);
          updateProfile('eski-sifre', 'yeni-ad').catch((hata: unknown) => {
            setProfilHatasi(hata instanceof Error ? hata.message : 'hata');
          });
        }}
      >
        Kullanıcı adını değiştir
      </button>
      {profilHatasi && <p role="alert">{profilHatasi}</p>}
      {isAuthenticated && <VeriEkrani />}
    </div>
  );
}

function testUygulamasiniOlustur(sorguIstemcisi: QueryClient) {
  render(
    <QueryClientProvider client={sorguIstemcisi}>
      <AuthProvider>
        <TestUygulamasi />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  session.clear();
});

/**
 * Review bulgusu I1: `logout` sorgu onbellegini TEMIZLEMEZSE, B hesabi giris yapinca -- ayni
 * `QueryClient` A'nin verisini hala tutuyor oldugundan -- B'nin ekrani B'nin gercek verisi
 * gelmeden ONCE A'nin onbellekteki (bayat) verisini gosterir. Bunu yakalamak icin B'nin
 * `/api/records` yaniti BILEREK GECIKTIRILIR: fix dogruysa bu pencerede A'nin verisi HIC
 * gorunmez (onbellek cikiste bosaltildigi icin gosterecek stale bir deger yoktur).
 */
test('cikis yapinca sorgu onbellegi temizlenir: B girisinde A nin verisi hic gorunmez', async () => {
  session.write('token-A', new Date(Date.now() + 3_600_000).toISOString(), 'kullaniciA');

  server.use(
    http.get('/api/records', ({ request }) => {
      const yetkiBasligi = request.headers.get('Authorization');
      if (yetkiBasligi === 'Bearer token-A') {
        return HttpResponse.json([ornekRekor({ exerciseId: 1, exerciseName: 'A Kaydı' })]);
      }
      return HttpResponse.json([]);
    }),
    http.post('/api/auth/login', () =>
      HttpResponse.json({
        token: 'token-B',
        expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
        username: 'kullaniciB',
      }),
    ),
  );

  const sorguIstemcisi = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const kullanici = userEvent.setup();
  testUygulamasiniOlustur(sorguIstemcisi);

  expect(await screen.findByText('A Kaydı')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Çıkış' }));

  // B icin kayitlari GECIKMELI dondur -- A'nin verisinin bu pencerede hic gorunmedigini
  // dogrulayabilmek icin B'nin gercek verisi gelmeden once yeterli bir sure birakiyoruz.
  server.use(
    http.get('/api/records', async ({ request }) => {
      const yetkiBasligi = request.headers.get('Authorization');
      if (yetkiBasligi === 'Bearer token-B') {
        await delay(100);
        return HttpResponse.json([ornekRekor({ exerciseId: 2, exerciseName: 'B Kaydı' })]);
      }
      return HttpResponse.json([]);
    }),
  );

  // B'nin gercek verisi gelene kadar DOM'u surekli (10ms araliklarla) izleyip A'nin verisinin
  // HICBIR ANDA gorunmedigini dogruluyoruz -- tek seferlik bir kontrol, mount aninda ANINDA
  // (senkron onbellek okumasiyla) gorunup hemen kaybolan bir "A Kaydı" yanip sonmesini
  // yakalayamayabilirdi.
  let aKaydiGoruldu = false;
  const izleyici = setInterval(() => {
    if (screen.queryByText('A Kaydı')) {
      aKaydiGoruldu = true;
    }
  }, 10);

  try {
    await kullanici.click(screen.getByRole('button', { name: 'Giriş B' }));
    expect(await screen.findByText('B Kaydı', undefined, { timeout: 2000 })).toBeInTheDocument();
  } finally {
    clearInterval(izleyici);
  }

  expect(aKaydiGoruldu).toBe(false);
  expect(screen.queryByText('A Kaydı')).not.toBeInTheDocument();
});

// --- updateProfile (issue #65) ---

test('updateProfile basarili olunca oturum yeni token ve kullanici adiyla guncellenir', async () => {
  session.write('eski-token', new Date(Date.now() + 3_600_000).toISOString(), 'eskiad');
  server.use(
    http.patch('/api/auth/me', () =>
      HttpResponse.json({
        token: 'yeni-token',
        expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
        username: 'yeniad',
      }),
    ),
  );

  const kullanici = userEvent.setup();
  testUygulamasiniOlustur(
    new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }),
  );

  expect(await screen.findByText('Kullanıcı: eskiad')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Kullanıcı adını değiştir' }));

  expect(await screen.findByText('Kullanıcı: yeniad')).toBeInTheDocument();
  expect(session.read()).toMatchObject({ token: 'yeni-token', username: 'yeniad' });
});

test('updateProfile 401 (yanlis mevcut sifre) donerse oturum DUSMEZ, hata firlar', async () => {
  // Issue #65: bu 401 "oturum gecersiz" degil "sifreni yanlis yazdin" demektir -- kullaniciyi
  // giris ekranina firlatmamali (client.ts'teki sifreTeyidi401 ile ayni gerekce).
  session.write('gecerli-token', new Date(Date.now() + 3_600_000).toISOString(), 'benimadim');
  server.use(
    http.patch('/api/auth/me', () =>
      HttpResponse.json({ title: 'Yetkisiz', status: 401, detail: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 }),
    ),
  );

  const kullanici = userEvent.setup();
  testUygulamasiniOlustur(
    new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }),
  );

  await screen.findByText('Kullanıcı: benimadim');
  await kullanici.click(screen.getByRole('button', { name: 'Kullanıcı adını değiştir' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Kullanıcı adı veya şifre hatalı.');
  // Oturum hala yerinde: kullanici adi degismedi, cikis yapilmadi.
  expect(screen.getByText('Kullanıcı: benimadim')).toBeInTheDocument();
  expect(session.read()?.token).toBe('gecerli-token');
});
