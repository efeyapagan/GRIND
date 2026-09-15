import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../test/msw';
import InsightsPage from './InsightsPage';
import { PageTitleProvider } from '../ui/PageTitleContext';
import type { components } from '../api/schema';

type AiInsightResponse = components['schemas']['AiInsightResponse'];
type AiInsightResponsePagedResponse = components['schemas']['AiInsightResponsePagedResponse'];

function testeOzelSorguIstemcisi(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function ekraniOlustur() {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <PageTitleProvider>
        <MemoryRouter initialEntries={['/insights']}>
          <Routes>
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/history" element={<p>Geçmiş sayfası</p>} />
          </Routes>
        </MemoryRouter>
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

function ornekYorum(gecersizler: Partial<AiInsightResponse> = {}): AiInsightResponse {
  return {
    id: 1,
    kind: 'Insight',
    workoutSessionId: null,
    setEntryId: null,
    rangeFrom: '2026-08-16',
    rangeTo: '2026-09-14',
    content: 'Bench Press hacminde son iki haftada artış var.',
    model: 'claude-opus-5',
    tokensUsed: 500,
    estimatedCostUsd: 0.01,
    createdAt: '2026-09-14T10:00:00Z',
    ...gecersizler,
  };
}

function sayfaYaniti(
  yorumlar: AiInsightResponse[],
  zarf: Partial<AiInsightResponsePagedResponse> = {},
): AiInsightResponsePagedResponse {
  return {
    items: yorumlar,
    page: 1,
    pageSize: 20,
    totalCount: yorumlar.length,
    totalPages: 1,
    ...zarf,
  };
}

test('gecmise donus baglantisi /history\'e gider', async () => {
  server.use(http.get('/api/insights', () => HttpResponse.json(sayfaYaniti([]))));
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await kullanici.click(screen.getByRole('link', { name: 'Geçmiş' }));

  expect(await screen.findByText('Geçmiş sayfası')).toBeInTheDocument();
});

test('hic yorum yoksa bos durum gorunur', async () => {
  server.use(http.get('/api/insights', () => HttpResponse.json(sayfaYaniti([]))));
  ekraniOlustur();

  expect(await screen.findByText('Henüz yorum yok')).toBeInTheDocument();
});

test('yorumlar listelenir, en yeniden eskiye sunucunun sirasiyla', async () => {
  server.use(
    http.get('/api/insights', () =>
      HttpResponse.json(
        sayfaYaniti([
          ornekYorum({ id: 2, content: 'İkinci yorum', createdAt: '2026-09-14T10:00:00Z' }),
          ornekYorum({ id: 1, content: 'İlk yorum', createdAt: '2026-09-10T10:00:00Z' }),
        ]),
      ),
    ),
  );
  ekraniOlustur();

  const satirlar = await screen.findAllByRole('listitem');
  expect(satirlar).toHaveLength(2);
  expect(satirlar[0]).toHaveTextContent('İkinci yorum');
  expect(satirlar[1]).toHaveTextContent('İlk yorum');
});

test('Yorum iste govdesiz POST atar, basarili olunca liste tazelenir', async () => {
  let govde: unknown = 'dokunulmadi';
  let cagriSayisi = 0;
  server.use(
    http.get('/api/insights', () => {
      cagriSayisi += 1;
      return HttpResponse.json(sayfaYaniti(cagriSayisi > 1 ? [ornekYorum()] : []));
    }),
    http.post('/api/insights', async ({ request }) => {
      const metin = await request.text();
      govde = metin.length > 0 ? JSON.parse(metin) : null;
      return HttpResponse.json(ornekYorum(), { status: 201 });
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await screen.findByText('Henüz yorum yok');
  await kullanici.click(screen.getByRole('button', { name: 'Yorum iste' }));

  await waitFor(() => expect(screen.getByRole('listitem')).toHaveTextContent(ornekYorum().content));
  // Govde BILEREK gonderilmez -- backend govdesiz istekte kendi varsayilanini (son 30 gun) uygular.
  expect(govde).toBeNull();
});

test('uretim surerken Vazgec cikar; tiklaninca "beklemeyi durdurdun" mesaji gosterilir', async () => {
  server.use(
    http.get('/api/insights', () => HttpResponse.json(sayfaYaniti([]))),
    http.post('/api/insights', async () => {
      await delay(5000);
      return HttpResponse.json(ornekYorum(), { status: 201 });
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await screen.findByText('Henüz yorum yok');
  await kullanici.click(screen.getByRole('button', { name: 'Yorum iste' }));

  expect(await screen.findByText(/Yorum hazırlanıyor/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Yorum iste' })).not.toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Vazgeç' }));

  // Issue #76: iptal SADECE beklemeyi durdurur -- backend odenen cagriyi durdurmaz, bu ACIKCA
  // soylenir, "hicbir sey olmadi" izlenimi verilmez.
  expect(
    await screen.findByText(/Beklemeyi durdurdun\. Yorum yine de oluşturuluyor olabilir/),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Yorum iste' })).toBeInTheDocument();
});

test('AI kapaliyken (503) yumusak bir bilgi mesaji gosterilir, HataKutusu DEGIL', async () => {
  server.use(
    http.get('/api/insights', () => HttpResponse.json(sayfaYaniti([]))),
    http.post('/api/insights', () =>
      HttpResponse.json({ title: 'Kullanılamıyor', status: 503, detail: 'AI yorumlama şu an kapalı.' }, { status: 503 }),
    ),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await screen.findByText('Henüz yorum yok');
  await kullanici.click(screen.getByRole('button', { name: 'Yorum iste' }));

  expect(await screen.findByText('AI yorumlama şu an kapalı.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('haftalik sinir asilirsa (429) sunucunun dinamik mesaji yumusak bilgi olarak gosterilir', async () => {
  server.use(
    http.get('/api/insights', () => HttpResponse.json(sayfaYaniti([]))),
    http.post('/api/insights', () =>
      HttpResponse.json(
        {
          title: 'Çok fazla istek',
          status: 429,
          detail: 'Bir haftada en fazla 2 yorum alabilirsin. Sonraki hakkın 20.09.2026 20:00 tarihinde açılıyor.',
        },
        { status: 429 },
      ),
    ),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await screen.findByText('Henüz yorum yok');
  await kullanici.click(screen.getByRole('button', { name: 'Yorum iste' }));

  // Issue #76: sunucunun DINAMIK (tarih iceren) mesaji AYNEN gosterilir -- sabit bir metinle
  // ezilmez, cunku tarih her kullanicida/durumda farkli olur.
  expect(
    await screen.findByText('Bir haftada en fazla 2 yorum alabilirsin. Sonraki hakkın 20.09.2026 20:00 tarihinde açılıyor.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('bu araliktaki yorumlanacak veri yoksa (400) genel hata gosterilir', async () => {
  server.use(
    http.get('/api/insights', () => HttpResponse.json(sayfaYaniti([]))),
    http.post('/api/insights', () =>
      HttpResponse.json(
        { title: 'Geçersiz istek', status: 400, detail: 'Bu aralıkta yorumlanacak kayıt yok.' },
        { status: 400 },
      ),
    ),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await screen.findByText('Henüz yorum yok');
  await kullanici.click(screen.getByRole('button', { name: 'Yorum iste' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Bu aralıkta yorumlanacak kayıt yok.');
});

test('yorum silme once onay sorar, vazgecince istek gitmez', async () => {
  let silindiMi = false;
  server.use(
    http.get('/api/insights', () => HttpResponse.json(sayfaYaniti([ornekYorum()]))),
    http.delete('/api/insights/:id', () => {
      silindiMi = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Yorumu sil' }));
  expect(screen.getByText('Bu yorum kalıcı olarak silinecek.')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Vazgeç' }));

  expect(screen.queryByText('Bu yorum kalıcı olarak silinecek.')).not.toBeInTheDocument();
  expect(silindiMi).toBe(false);
});

test('onaylaninca DELETE gider ve yorum listeden kalkar', async () => {
  let yorumlar = [ornekYorum()];
  server.use(
    http.get('/api/insights', () => HttpResponse.json(sayfaYaniti(yorumlar))),
    http.delete('/api/insights/:id', () => {
      yorumlar = [];
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Yorumu sil' }));
  await kullanici.click(screen.getByRole('button', { name: 'Evet, sil' }));

  expect(await screen.findByText('Henüz yorum yok')).toBeInTheDocument();
});

test('sayfalama sunucunun zarfindan surulur', async () => {
  const aramalar: string[] = [];
  server.use(
    http.get('/api/insights', ({ request }) => {
      const url = new URL(request.url);
      aramalar.push(url.search);
      return HttpResponse.json(
        sayfaYaniti([ornekYorum()], { page: Number(url.searchParams.get('Page') ?? '1'), totalCount: 40, totalPages: 2 }),
      );
    }),
  );
  const kullanici = userEvent.setup();
  ekraniOlustur();

  await screen.findAllByRole('listitem');
  expect(screen.getByText('Sayfa 1 / 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Önceki' })).toBeDisabled();

  await kullanici.click(screen.getByRole('button', { name: 'Sonraki' }));

  await waitFor(() => expect(aramalar.some((a) => a.includes('Page=2'))).toBe(true));
});
