import { request, setUnauthorizedHandler } from './client';
import { session } from '../auth/session';

function ileriTarih(msSonra: number): string {
  return new Date(Date.now() + msSonra).toISOString();
}

function jsonYaniti(gövde: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(gövde), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

beforeEach(() => {
  session.clear();
  setUnauthorizedHandler(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  session.clear();
});

test('token varsa Authorization basligi Bearer ile eklenir', async () => {
  session.write('deneme-token', ileriTarih(60_000), 'efe');
  const fetchMock = vi.fn().mockResolvedValue(jsonYaniti({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);

  await request('/ornek');

  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const basliklar = init.headers as Record<string, string>;
  expect(basliklar.Authorization).toBe('Bearer deneme-token');
});

test('token yoksa Authorization basligi eklenmez', async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonYaniti({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);

  await request('/ornek');

  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const basliklar = (init.headers ?? {}) as Record<string, string>;
  expect(basliklar.Authorization).toBeUndefined();
});

test('istek yolu /api tabanina eklenir', async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonYaniti({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);

  await request('/egzersizler');

  const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe('/api/egzersizler');
});

test('govde varken Content-Type json eklenir, govde yokken eklenmez', async () => {
  // Her cagriya TAZE bir Response dondurulmeli -- ayni govde iki kez okunamaz.
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonYaniti({ ok: true })));
  vi.stubGlobal('fetch', fetchMock);

  await request('/govdesiz');
  const [, initGovdesiz] = fetchMock.mock.calls[0] as [string, RequestInit];
  const basliklarGovdesiz = (initGovdesiz.headers ?? {}) as Record<string, string>;
  expect(basliklarGovdesiz['Content-Type']).toBeUndefined();

  await request('/govdeli', { method: 'POST', body: JSON.stringify({ a: 1 }) });
  const [, initGovdeli] = fetchMock.mock.calls[1] as [string, RequestInit];
  const basliklarGovdeli = initGovdeli.headers as Record<string, string>;
  expect(basliklarGovdeli['Content-Type']).toBe('application/json');
});

/** #283: profil fotoğrafı multipart gider -- sınır (boundary) ekli başlığı tarayıcı kendisi yazar. */
test('FormData govdesinde Content-Type eklenmez', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);

  await request('/profile/avatar', { method: 'PUT', body: new FormData() });

  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
});

test('401 gelince kayitli oturum dusurme isleyicisi cagrilir ve ApiError firlatilir', async () => {
  const isleyici = vi.fn();
  setUnauthorizedHandler(isleyici);
  session.write('eski-token', ileriTarih(60_000), 'efe');

  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ title: 'Yetkisiz', status: 401 }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  await expect(request('/korumali')).rejects.toMatchObject({ status: 401, name: 'ApiError' });
  expect(isleyici).toHaveBeenCalledTimes(1);
});

test('sifreTeyidi401 ile 401 gelince oturum dusurulmez, hata yine firlar', async () => {
  // Issue #65: profil guncellerken yanlis mevcut sifre 401 doner ama bu "oturum gecersiz"
  // demek DEGILDIR -- kullaniciyi giris ekranina firlatmamali.
  const isleyici = vi.fn();
  setUnauthorizedHandler(isleyici);
  session.write('gecerli-token', ileriTarih(60_000), 'efe');

  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ title: 'Yetkisiz', status: 401 }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  await expect(request('/auth/me', { sifreTeyidi401: true })).rejects.toMatchObject({ status: 401 });
  expect(isleyici).not.toHaveBeenCalled();
  // Oturum bilgisi hala yerinde: yanlis sifre denemesi mevcut oturumu SILMEZ.
  expect(session.read()?.token).toBe('gecerli-token');
});

test('204 yanitta govde JSON olarak ayristirilmaya calisilmaz', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);

  await expect(request('/sil', { method: 'DELETE' })).resolves.toBeUndefined();
});

test('bos govdeli 200 yanit JSON ayristirmadan undefined doner', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);

  await expect(request('/bos')).resolves.toBeUndefined();
});
