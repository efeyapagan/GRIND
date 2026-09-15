import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import HistoryPage from './HistoryPage';
import { PageTitleProvider } from '../ui/PageTitleContext';
import type { components } from '../api/schema';
import { tamMetin } from '../test/metin';

type HistorySessionResponse = components['schemas']['HistorySessionResponse'];
type HistorySessionResponsePagedResponse = components['schemas']['HistorySessionResponsePagedResponse'];

function testeOzelSorguIstemcisi(): QueryClient {
  // Retry kapali -- basarisiz bir istek test zaman asimina kadar yeniden denenmesin (Task 3 kurali).
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

// `usePageTitle` (issue #65) bir `PageTitleProvider` ister -- App.tsx'in gercek kabugu bunu
// saglar, testte de aynisi sarilmali.
function gecmisSayfasiniOlustur() {
  return render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <PageTitleProvider>
        <HistoryPage />
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

function ornekOturum(gecersizler: Partial<HistorySessionResponse> = {}): HistorySessionResponse {
  return {
    sessionId: 1,
    startedAt: '2026-09-10T08:00:00Z',
    endedAt: '2026-09-10T09:00:00Z',
    templateName: null,
    notes: null,
    totalVolume: 1000,
    setCount: 3,
    sets: [],
    ...gecersizler,
  };
}

function sayfaYaniti(
  oturumlar: HistorySessionResponse[],
  zarf: Partial<HistorySessionResponsePagedResponse> = {},
): HistorySessionResponsePagedResponse {
  return {
    items: oturumlar,
    page: 1,
    pageSize: 20,
    totalCount: oturumlar.length,
    totalPages: 1,
    ...zarf,
  };
}

test('gecmis listesi oturumlari sunucunun sirasiyla gosterir; her satirda TR tarihi, set sayisi ve hacim var', async () => {
  const oturumlar: HistorySessionResponse[] = [
    ornekOturum({ sessionId: 2, startedAt: '2026-09-11T08:00:00Z', totalVolume: 500, setCount: 2 }),
    ornekOturum({ sessionId: 1, startedAt: '2026-09-10T08:00:00Z', totalVolume: 1000, setCount: 3 }),
  ];
  server.use(http.get('/api/history', () => HttpResponse.json(sayfaYaniti(oturumlar))));

  gecmisSayfasiniOlustur();

  const satirlar = await screen.findAllByRole('listitem');
  expect(satirlar).toHaveLength(2);
  // Sunucu zaten yeniden eskiye sirali doner (spec) -- istemci YENIDEN SIRALAMAZ, sunucunun
  // verdigi sirayi oldugu gibi gosterir.
  expect(satirlar[0]).toHaveTextContent('11.09.2026');
  expect(satirlar[0]).toHaveTextContent('2 set');
  expect(satirlar[0]).toHaveTextContent('500');
  expect(satirlar[1]).toHaveTextContent('10.09.2026');
  expect(satirlar[1]).toHaveTextContent('3 set');
  expect(satirlar[1]).toHaveTextContent('1.000');
});

test('sonraki sayfaya gecilebilir ve ikinci istek Page=2 tasir', async () => {
  const yakalananAramaDizgileri: string[] = [];
  server.use(
    http.get('/api/history', ({ request }) => {
      const url = new URL(request.url);
      yakalananAramaDizgileri.push(url.search);
      const sayfa = Number(url.searchParams.get('Page') ?? '1');
      return HttpResponse.json(
        sayfaYaniti([ornekOturum({ sessionId: sayfa })], {
          page: sayfa,
          totalCount: 40,
          totalPages: 2,
        }),
      );
    }),
  );

  const kullanici = userEvent.setup();
  gecmisSayfasiniOlustur();

  await screen.findAllByRole('listitem');
  // Sayfa bilgisi ve toplam sayi sunucunun zarfindan gelir, istemcide hesaplanmaz (spec).
  expect(screen.getByText('Sayfa 1 / 2')).toBeInTheDocument();
  expect(screen.getByText('40 antrenman')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Önceki' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Sonraki' })).toBeEnabled();

  await kullanici.click(screen.getByRole('button', { name: 'Sonraki' }));

  await waitFor(() =>
    expect(yakalananAramaDizgileri.some((dizgi) => dizgi.includes('Page=2'))).toBe(true),
  );
  // Son (2.) sayfadayken "Sonraki" artik pasif olmali (spec: totalPages'e gore surulur).
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sonraki' })).toBeDisabled());
});

test('hic oturum yoksa bos durum metni gorunur', async () => {
  server.use(http.get('/api/history', () => HttpResponse.json(sayfaYaniti([], { totalPages: 0 }))));

  gecmisSayfasiniOlustur();

  expect(await screen.findByText('Henüz antrenman geçmişi yok')).toBeInTheDocument();
});

test('seti olmayan oturum setCount 0 ile GIZLENMEDEN gosterilir', async () => {
  server.use(
    http.get('/api/history', () =>
      HttpResponse.json(sayfaYaniti([ornekOturum({ setCount: 0, totalVolume: 0 })])),
    ),
  );

  gecmisSayfasiniOlustur();

  const satir = await screen.findByRole('listitem');
  expect(satir).toHaveTextContent('0 set');
});

test('oturum detayi acilinca setleri SetList ile gosterir (ayri istek atmadan)', async () => {
  server.use(
    http.get('/api/history', () =>
      HttpResponse.json(
        sayfaYaniti([
          ornekOturum({
            sets: [
              {
                id: 10,
                sessionId: 1,
                exerciseId: 1,
                exerciseName: 'Bench Press',
                weight: 60,
                reps: 8,
                recordType: 'None',
                rir: null,
                createdAt: '2026-09-10T08:00:00Z',
              },
            ],
          }),
        ]),
      ),
    ),
  );

  const kullanici = userEvent.setup();
  gecmisSayfasiniOlustur();

  const ozet = await screen.findByText(/10\.09\.2026/);
  await kullanici.click(ozet);

  expect(await screen.findByText(tamMetin('60 kg × 8'))).toBeInTheDocument();
});

test('genisletilmis, seti olmayan bir gecmis oturumu "Bugün" metni DEGIL notr bir metin gosterir', async () => {
  // T5: SetList "Bugün henüz set eklenmedi." metnini sabit kullaniyordu -- bu, gecmis bir
  // gunun genisletilmis, seti olmayan bir oturumunda da gorunurdu, ki YANLIS: o gun "bugun"
  // degil.
  server.use(
    http.get('/api/history', () =>
      HttpResponse.json(sayfaYaniti([ornekOturum({ setCount: 0, sets: [] })])),
    ),
  );

  const kullanici = userEvent.setup();
  gecmisSayfasiniOlustur();

  const ozet = await screen.findByText(/10\.09\.2026/);
  await kullanici.click(ozet);

  expect(await screen.findByText('Bu antrenmanda set yok.')).toBeInTheDocument();
  expect(screen.queryByText('Bugün henüz set eklenmedi.')).not.toBeInTheDocument();
});

test('gecmis istegi basarisiz olursa hata gosterilir, bos durum metni GORUNMEZ', async () => {
  server.use(
    http.get('/api/history', () =>
      HttpResponse.json({ title: 'Sunucu hatası', status: 500 }, { status: 500 }),
    ),
  );

  gecmisSayfasiniOlustur();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Geçmiş alınamadı. Lütfen sayfayı yenileyin.',
  );
  // KRITIK: bir sunucu hatasi, "hic oturum yok" bos durumuyla KARISTIRILMAMALI (Task 4'te
  // aynen bu hataya dusulmustu, TodayPage'de duzeltildi -- burada tekrarlanmiyor).
  expect(screen.queryByText('Henüz antrenman geçmişi yok')).not.toBeInTheDocument();
});

test('kart ozetinde sablon adi ya da Serbest gorunur', async () => {
  server.use(
    http.get('/api/history', () =>
      HttpResponse.json(
        sayfaYaniti([
          ornekOturum({ sessionId: 2, startedAt: '2026-09-11T08:00:00Z', templateName: 'Push Day' }),
          ornekOturum({ sessionId: 1, startedAt: '2026-09-10T08:00:00Z', templateName: null }),
        ]),
      ),
    ),
  );

  gecmisSayfasiniOlustur();

  const satirlar = await screen.findAllByRole('listitem');
  expect(satirlar[0]).toHaveTextContent('Push Day');
  expect(satirlar[1]).toHaveTextContent('Serbest');
});

// --- Silme akisi (issue #46) ---

/**
 * Silme GECIKMELIDIR: onaydan sonra DELETE hemen gitmez, geri alma penceresi kapaninca gider.
 * Bu yuzden "istek gitti mi" sorusu her testte sahte sunucuya dusen cagrilarla dogrulanir.
 */
function silmeyiIzle(): { silinenler: number[] } {
  const silinenler: number[] = [];
  server.use(
    http.delete('/api/sessions/:id', ({ params }) => {
      silinenler.push(Number(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { silinenler };
}

test('kart icindeki sil dugmesi once onay sorar, vazgecince hicbir sey silinmez', async () => {
  server.use(http.get('/api/history', () => HttpResponse.json(sayfaYaniti([ornekOturum()]))));
  const izleme = silmeyiIzle();
  const kullanici = userEvent.setup();
  gecmisSayfasiniOlustur();

  // Kart icindeki gorunur yol: kaydirma yapamayan herkes icin (klavye, ekran okuyucu).
  await kullanici.click(await screen.findByRole('button', { name: 'Antrenmanı sil' }));

  expect(screen.getByText(/10.09.2026 tarihli antrenman ve 3 seti silinecek/)).toBeInTheDocument();
  expect(screen.getByText(/rekorları yeniden hesaplanır/)).toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Vazgeç' }));

  expect(screen.getByRole('button', { name: 'Antrenmanı sil' })).toBeInTheDocument();
  expect(izleme.silinenler).toEqual([]);
});

test('onaylaninca kart kalkar, geri al seridi cikar ve DELETE henuz gitmez', async () => {
  server.use(http.get('/api/history', () => HttpResponse.json(sayfaYaniti([ornekOturum()]))));
  const izleme = silmeyiIzle();
  const kullanici = userEvent.setup();
  gecmisSayfasiniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Antrenmanı sil' }));
  await kullanici.click(screen.getByRole('button', { name: 'Evet, sil' }));

  expect(await screen.findByText('Antrenman silindi')).toBeInTheDocument();
  expect(screen.queryByText('10.09.2026')).not.toBeInTheDocument();
  // Pencere acikken istek gitmez: API silinmis bir antrenmani geri getiremedigi icin tek
  // durust geri alma, silmeyi henuz YAPMAMIS olmaktir.
  expect(izleme.silinenler).toEqual([]);
});

test('geri al kartu listeye dondurur ve DELETE hic gitmez', async () => {
  server.use(http.get('/api/history', () => HttpResponse.json(sayfaYaniti([ornekOturum()]))));
  const izleme = silmeyiIzle();
  const kullanici = userEvent.setup();
  gecmisSayfasiniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Antrenmanı sil' }));
  await kullanici.click(screen.getByRole('button', { name: 'Evet, sil' }));
  await kullanici.click(await screen.findByRole('button', { name: 'Geri al' }));

  expect(await screen.findByText('10.09.2026')).toBeInTheDocument();
  expect(screen.queryByText('Antrenman silindi')).not.toBeInTheDocument();
  expect(izleme.silinenler).toEqual([]);
});

test('geri alma penceresi acikken sayfadan cikilirsa silme tamamlanir', async () => {
  server.use(http.get('/api/history', () => HttpResponse.json(sayfaYaniti([ornekOturum()]))));
  const izleme = silmeyiIzle();
  const kullanici = userEvent.setup();
  const { unmount } = gecmisSayfasiniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Antrenmanı sil' }));
  await kullanici.click(screen.getByRole('button', { name: 'Evet, sil' }));
  expect(await screen.findByText('Antrenman silindi')).toBeInTheDocument();

  // Kullanici "sildim" dedi ve geri ALMADI; baska bir sekmeye gecmek silmeyi iptal etmez.
  unmount();

  await waitFor(() => expect(izleme.silinenler).toEqual([1]));
});

test('telefonu sallamak silmeyi geri alir', async () => {
  server.use(http.get('/api/history', () => HttpResponse.json(sayfaYaniti([ornekOturum()]))));
  const izleme = silmeyiIzle();
  // jsdom'da hareket sensoru yok; dinleyicinin baglanabilmesi icin varligi taklit edilir.
  const oncekiOlay = window.DeviceMotionEvent;
  Object.defineProperty(window, 'DeviceMotionEvent', { value: class {}, configurable: true });

  const kullanici = userEvent.setup();
  gecmisSayfasiniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Antrenmanı sil' }));
  await kullanici.click(screen.getByRole('button', { name: 'Evet, sil' }));
  expect(await screen.findByText('Antrenman silindi')).toBeInTheDocument();

  salla({ x: 0, y: 0, z: -9.8 });
  // Iki olcum arasinda en az bir ornekleme araligi olmali (cihaz ~60 Hz orneklyor, her olcum
  // islenmez); ilk olcum yalnizca kiyas noktasini kurar.
  await new Promise((coz) => setTimeout(coz, 150));
  salla({ x: 0, y: 0, z: 30 });

  expect(await screen.findByText('10.09.2026')).toBeInTheDocument();
  expect(izleme.silinenler).toEqual([]);

  Object.defineProperty(window, 'DeviceMotionEvent', { value: oncekiOlay, configurable: true });
});

/** Gercek bir `DeviceMotionEvent` jsdom'da uretilemez; olay nesnesine olculen ivme eklenir. */
function salla(ivme: { x: number; y: number; z: number }) {
  const olay = new Event('devicemotion');
  Object.defineProperty(olay, 'accelerationIncludingGravity', { value: ivme });
  act(() => {
    window.dispatchEvent(olay);
  });
}
