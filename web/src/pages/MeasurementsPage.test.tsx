import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import MeasurementsPage from './MeasurementsPage';
import { PageTitleProvider } from '../ui/PageTitleContext';
import type { components } from '../api/schema';
import { sahteKesisimGozlemcisiKur } from '../test/kesisimGozlemcisi';

type BodyWeightLogResponse = components['schemas']['BodyWeightLogResponse'];
type BodyWeightLogResponsePagedResponse = components['schemas']['BodyWeightLogResponsePagedResponse'];

function testeOzelSorguIstemcisi(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function ekraniOlustur() {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <PageTitleProvider>
        <MeasurementsPage />
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

/** "Yeni ölçüm ekle" pencereyi (dialog) açar -- form her zaman bu pencerenin içindedir. */
async function penceresiniAc(kullanici: ReturnType<typeof userEvent.setup>) {
  await kullanici.click(screen.getByRole('button', { name: 'Yeni ölçüm ekle' }));
}

function ornekOlcu(gecersizler: Partial<BodyWeightLogResponse> = {}): BodyWeightLogResponse {
  return {
    id: 1,
    weight: 82.4,
    heightCm: 180,
    bodyFatPercent: null,
    waistCm: null,
    hipCm: null,
    recordedAt: '2026-09-18T10:00:00Z',
    ...gecersizler,
  };
}

function sayfaYaniti(
  olculer: BodyWeightLogResponse[],
  zarf: Partial<BodyWeightLogResponsePagedResponse> = {},
): BodyWeightLogResponsePagedResponse {
  return { items: olculer, page: 1, pageSize: 25, totalCount: olculer.length, totalPages: 1, ...zarf };
}

afterEach(() => vi.unstubAllGlobals());

test('listenin sonuna gelinince sonraki sayfa otomatik yuklenir ve iki sayfanin olculeri birlikte gorunur', async () => {
  const aramalar: string[] = [];
  server.use(
    http.get('/api/body-weights', ({ request }) => {
      const url = new URL(request.url);
      aramalar.push(url.search);
      const sayfa = Number(url.searchParams.get('Page') ?? '1');
      return HttpResponse.json(
        sayfaYaniti([ornekOlcu({ id: sayfa })], { page: sayfa, totalCount: 40, totalPages: 2 }),
      );
    }),
  );
  const gozlemci = sahteKesisimGozlemcisiKur();
  ekraniOlustur();

  await screen.findAllByRole('listitem');
  expect(screen.queryByRole('button', { name: 'Sonraki' })).not.toBeInTheDocument();
  expect(aramalar).toEqual(['?Page=1&PageSize=25']);

  gozlemci.tetikle();

  await waitFor(() => expect(aramalar).toEqual(['?Page=1&PageSize=25', '?Page=2&PageSize=25']));
  expect(await screen.findAllByRole('listitem')).toHaveLength(2);
});

test('son sayfadaysa gozlemci tekrar tetiklense bile yeni istek atilmaz', async () => {
  const aramalar: string[] = [];
  server.use(
    http.get('/api/body-weights', ({ request }) => {
      aramalar.push(new URL(request.url).search);
      return HttpResponse.json(sayfaYaniti([ornekOlcu()], { page: 1, totalCount: 1, totalPages: 1 }));
    }),
  );
  const gozlemci = sahteKesisimGozlemcisiKur();
  ekraniOlustur();

  await screen.findAllByRole('listitem');
  expect(aramalar).toHaveLength(1);

  gozlemci.tetikle();
  gozlemci.tetikle();

  await new Promise((coz) => setTimeout(coz, 50));
  expect(aramalar).toHaveLength(1);
});

test('hic olcu yoksa bos durum gorunur', async () => {
  server.use(http.get('/api/body-weights', () => HttpResponse.json(sayfaYaniti([]))));
  ekraniOlustur();

  expect(await screen.findByText('Henüz ölçü yok')).toBeInTheDocument();
});

test('olculer listelenir, sadece dolu olan alanlari gosterir', async () => {
  server.use(
    http.get('/api/body-weights', () =>
      HttpResponse.json(
        sayfaYaniti([
          ornekOlcu({ id: 1, weight: 82.4, heightCm: 180, bodyFatPercent: null, waistCm: null, hipCm: null }),
          ornekOlcu({ id: 2, weight: null, heightCm: null, bodyFatPercent: 18.5, waistCm: 82, hipCm: 98 }),
        ]),
      ),
    ),
  );
  ekraniOlustur();

  const satirlar = await screen.findAllByRole('listitem');
  expect(satirlar).toHaveLength(2);
  expect(satirlar[0]).toHaveTextContent('82.4 kg');
  expect(satirlar[0]).toHaveTextContent('180 cm boy');
  expect(satirlar[0]).not.toHaveTextContent('yağ');
  expect(satirlar[1]).toHaveTextContent('%18.5 yağ');
  expect(satirlar[1]).toHaveTextContent('82 cm bel');
  expect(satirlar[1]).toHaveTextContent('98 cm kalça');
  expect(satirlar[1]).not.toHaveTextContent('kg,');
});

test('pencere acilir, form govdesi doldurulan alanlari tasir, basarili olunca pencere kapanir', async () => {
  let govde: unknown = 'dokunulmadi';
  let cagriSayisi = 0;
  server.use(
    http.get('/api/body-weights', () => {
      cagriSayisi += 1;
      return HttpResponse.json(sayfaYaniti(cagriSayisi > 1 ? [ornekOlcu()] : []));
    }),
    http.post('/api/body-weights', async ({ request }) => {
      govde = await request.json();
      return HttpResponse.json(ornekOlcu(), { status: 201 });
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await screen.findByText('Henüz ölçü yok');
  await penceresiniAc(kullanici);
  expect(screen.getByRole('heading', { name: 'Yeni ölçüm' })).toBeInTheDocument();

  await kullanici.type(screen.getByLabelText(/Boy/), '180');
  await kullanici.type(screen.getByLabelText(/Kilo/), '82.4');
  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  await screen.findByText('82.4 kg, 180 cm boy');
  expect(govde).toEqual({
    weight: 82.4,
    heightCm: 180,
    bodyFatPercent: undefined,
    waistCm: undefined,
    hipCm: undefined,
  });
  // Basarili gonderim sonrasi pencere kapanir (baslik artik ekranda yok).
  expect(screen.queryByRole('heading', { name: 'Yeni ölçüm' })).not.toBeInTheDocument();
});

test('kilo ve boy olmadan gonderilirse istek atilmadan alan hatalari gosterilir', async () => {
  let istekAtildiMi = false;
  server.use(
    http.get('/api/body-weights', () => HttpResponse.json(sayfaYaniti([]))),
    http.post('/api/body-weights', () => {
      istekAtildiMi = true;
      return HttpResponse.json(ornekOlcu(), { status: 201 });
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await screen.findByText('Henüz ölçü yok');
  await penceresiniAc(kullanici);
  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Kilo gerekli.')).toBeInTheDocument();
  expect(screen.getByText('Boy gerekli.')).toBeInTheDocument();
  expect(istekAtildiMi).toBe(false);
});

/** Issue #119, kullanıcı kararı: aynı gün aynı boy+kilo sunucudan 409 alır -- "zaten kayıtlı" gösterilir. */
test('sunucu 409 donerse "zaten kayitli" mesaji gosterilir, pencere acik kalir', async () => {
  server.use(
    http.get('/api/body-weights', () => HttpResponse.json(sayfaYaniti([]))),
    http.post('/api/body-weights', () =>
      HttpResponse.json(
        { title: 'Çakışma', status: 409, detail: 'Bu gün için aynı boy ve kiloyla bir ölçüm zaten kayıtlı.' },
        { status: 409 },
      ),
    ),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await screen.findByText('Henüz ölçü yok');
  await penceresiniAc(kullanici);
  await kullanici.type(screen.getByLabelText(/Boy/), '180');
  await kullanici.type(screen.getByLabelText(/Kilo/), '82.4');
  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(
    await screen.findByText('Bu gün için aynı boy ve kiloyla bir ölçüm zaten kayıtlı.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Yeni ölçüm' })).toBeInTheDocument();
});

/**
 * Issue #260: ayni gun (TR) icin FARKLI degerli ikinci bir olcum girilince soru sorulur -- TAM AYNI
 * boy+kiloyla ikinci giriside (yukaridaki 409 testi) bu soru CIKMAZ, davranis degismedi.
 */
describe('ayni gun ikinci olcum sorusu (#260)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-18T18:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('farkli degerli ikinci olcumde soru cikar, "Ekstra olcum" normal POST atar', async () => {
    let govde: unknown = 'dokunulmadi';
    server.use(
      http.get('/api/body-weights', () =>
        HttpResponse.json(sayfaYaniti([ornekOlcu({ id: 1, recordedAt: '2026-09-18T10:00:00Z' })])),
      ),
      http.post('/api/body-weights', async ({ request }) => {
        govde = await request.json();
        return HttpResponse.json(ornekOlcu({ id: 2, weight: 79.5, recordedAt: '2026-09-18T18:00:00Z' }), {
          status: 201,
        });
      }),
    );
    const kullanici = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    ekraniOlustur();

    await penceresiniAc(kullanici);
    await kullanici.type(screen.getByLabelText(/Boy/), '180');
    await kullanici.type(screen.getByLabelText(/Kilo/), '79.5');
    await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByRole('heading', { name: 'Bugün için başka bir ölçüm girdiniz.' })).toBeInTheDocument();
    // Boy/kilo alanlari artik gorunmuyor -- yalnizca uc secenek.
    expect(screen.queryByLabelText(/Boy/)).not.toBeInTheDocument();

    await kullanici.click(screen.getByRole('button', { name: 'Ekstra ölçüm' }));

    await waitFor(() => expect(govde).toMatchObject({ weight: 79.5, heightCm: 180 }));
    expect(screen.queryByRole('heading', { name: 'Yeni ölçüm' })).not.toBeInTheDocument();
  });

  test('"Ölçümü değiştir" gunun EN SON olcumunu PATCH ile gunceller', async () => {
    let patchGovde: unknown = 'dokunulmadi';
    let patchedId: string | undefined;
    server.use(
      http.get('/api/body-weights', () =>
        HttpResponse.json(
          sayfaYaniti([
            ornekOlcu({ id: 5, weight: 80, recordedAt: '2026-09-18T15:00:00Z' }),
            ornekOlcu({ id: 1, weight: 81, recordedAt: '2026-09-18T09:00:00Z' }),
          ]),
        ),
      ),
      http.patch('/api/body-weights/:id', async ({ request, params }) => {
        patchedId = params.id as string;
        patchGovde = await request.json();
        return HttpResponse.json(ornekOlcu({ id: 5, weight: 79.5, recordedAt: '2026-09-18T15:00:00Z' }));
      }),
    );
    const kullanici = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    ekraniOlustur();

    await penceresiniAc(kullanici);
    await kullanici.type(screen.getByLabelText(/Boy/), '180');
    await kullanici.type(screen.getByLabelText(/Kilo/), '79.5');
    await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

    await kullanici.click(await screen.findByRole('button', { name: 'Ölçümü değiştir' }));

    await waitFor(() => expect(patchedId).toBe('5'));
    expect(patchGovde).toMatchObject({ weight: 79.5, heightCm: 180 });
    expect(screen.queryByRole('heading', { name: 'Bugün için başka bir ölçüm girdiniz.' })).not.toBeInTheDocument();
  });

  test('"Vazgec" soruyu kapatir, form degerleri korunur, hicbir istek gitmez', async () => {
    let istekAtildiMi = false;
    server.use(
      http.get('/api/body-weights', () =>
        HttpResponse.json(sayfaYaniti([ornekOlcu({ id: 1, recordedAt: '2026-09-18T10:00:00Z' })])),
      ),
      http.post('/api/body-weights', () => {
        istekAtildiMi = true;
        return HttpResponse.json(ornekOlcu(), { status: 201 });
      }),
    );
    const kullanici = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    ekraniOlustur();

    await penceresiniAc(kullanici);
    await kullanici.type(screen.getByLabelText(/Boy/), '180');
    await kullanici.type(screen.getByLabelText(/Kilo/), '79.5');
    await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

    await kullanici.click(await screen.findByRole('button', { name: 'Vazgeç' }));

    expect(screen.getByRole('heading', { name: 'Yeni ölçüm' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Boy/)).toHaveValue('180');
    expect(screen.getByLabelText(/Kilo/)).toHaveValue('79.5');
    expect(istekAtildiMi).toBe(false);
  });

  test('tam ayni boy+kiloyla ikinci giriste soru CIKMAZ, sunucu 409 doner (#119 davranisi degismedi)', async () => {
    server.use(
      http.get('/api/body-weights', () =>
        HttpResponse.json(sayfaYaniti([ornekOlcu({ id: 1, weight: 82.4, heightCm: 180, recordedAt: '2026-09-18T10:00:00Z' })])),
      ),
      http.post('/api/body-weights', () =>
        HttpResponse.json(
          { title: 'Çakışma', status: 409, detail: 'Bu gün için aynı boy ve kiloyla bir ölçüm zaten kayıtlı.' },
          { status: 409 },
        ),
      ),
    );
    const kullanici = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    ekraniOlustur();

    await penceresiniAc(kullanici);
    await kullanici.type(screen.getByLabelText(/Boy/), '180');
    await kullanici.type(screen.getByLabelText(/Kilo/), '82.4');
    await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(
      await screen.findByText('Bu gün için aynı boy ve kiloyla bir ölçüm zaten kayıtlı.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bugün için başka bir ölçüm girdiniz.' })).not.toBeInTheDocument();
  });
});

test('pencere Kapat dugmesiyle kapanir', async () => {
  server.use(http.get('/api/body-weights', () => HttpResponse.json(sayfaYaniti([]))));
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await screen.findByText('Henüz ölçü yok');
  await penceresiniAc(kullanici);
  expect(screen.getByRole('heading', { name: 'Yeni ölçüm' })).toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Kapat' }));

  expect(screen.queryByRole('heading', { name: 'Yeni ölçüm' })).not.toBeInTheDocument();
});

test('olcu silme once onay sorar, vazgecince istek gitmez', async () => {
  let silindiMi = false;
  server.use(
    http.get('/api/body-weights', () => HttpResponse.json(sayfaYaniti([ornekOlcu()]))),
    http.delete('/api/body-weights/:id', () => {
      silindiMi = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Ölçüyü sil' }));
  expect(screen.getByText('Bu ölçü kalıcı olarak silinecek.')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Vazgeç' }));

  expect(screen.queryByText('Bu ölçü kalıcı olarak silinecek.')).not.toBeInTheDocument();
  expect(silindiMi).toBe(false);
});

test('onaylaninca DELETE gider ve olcu listeden kalkar', async () => {
  let olculer = [ornekOlcu()];
  server.use(
    http.get('/api/body-weights', () => HttpResponse.json(sayfaYaniti(olculer))),
    http.delete('/api/body-weights/:id', () => {
      olculer = [];
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Ölçüyü sil' }));
  await kullanici.click(screen.getByRole('button', { name: 'Evet, sil' }));

  expect(await screen.findByText('Henüz ölçü yok')).toBeInTheDocument();
});
