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

function ornekOlcu(gecersizler: Partial<BodyWeightLogResponse> = {}): BodyWeightLogResponse {
  return {
    id: 1,
    weight: 82.4,
    bodyFatPercent: null,
    waistCm: null,
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
          ornekOlcu({ id: 1, weight: 82.4, bodyFatPercent: null, waistCm: null }),
          ornekOlcu({ id: 2, weight: null, bodyFatPercent: 18.5, waistCm: 82 }),
        ]),
      ),
    ),
  );
  ekraniOlustur();

  const satirlar = await screen.findAllByRole('listitem');
  expect(satirlar).toHaveLength(2);
  expect(satirlar[0]).toHaveTextContent('82.4 kg');
  expect(satirlar[0]).not.toHaveTextContent('yağ');
  expect(satirlar[1]).toHaveTextContent('%18.5 yağ');
  expect(satirlar[1]).toHaveTextContent('82 cm bel');
  expect(satirlar[1]).not.toHaveTextContent('kg,');
});

test('form govdesi sadece doldurulan alanlari tasir, digerleri gonderilmez', async () => {
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
  await kullanici.type(screen.getByLabelText(/Kilo/), '82.4');
  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  await screen.findByText('82.4 kg');
  expect(govde).toEqual({ weight: 82.4, bodyFatPercent: undefined, waistCm: undefined });
});

test('ucu de bos gonderilirse istek atilmadan genel hata gosterilir', async () => {
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
  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('En az bir ölçü girmelisin.')).toBeInTheDocument();
  expect(istekAtildiMi).toBe(false);
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
