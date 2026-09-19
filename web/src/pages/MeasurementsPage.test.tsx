import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import MeasurementsPage from './MeasurementsPage';
import { PageTitleProvider } from '../ui/PageTitleContext';
import type { components } from '../api/schema';

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
  return { items: olculer, page: 1, pageSize: 20, totalCount: olculer.length, totalPages: 1, ...zarf };
}

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
