import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import RecordsPage from './RecordsPage';
import { PageTitleProvider } from '../ui/PageTitleContext';
import type { components } from '../api/schema';

type ExerciseRecordResponse = components['schemas']['ExerciseRecordResponse'];

function testeOzelSorguIstemcisi(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

// `usePageTitle` (issue #65) bir `PageTitleProvider` ister -- App.tsx'in gercek kabugu bunu
// saglar, testte de aynisi sarilmali (aksi halde hook context bulunamadi diye firlar).
function rekorlarSayfasiniOlustur() {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <PageTitleProvider>
        <RecordsPage />
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

/** #117: sayfa en uzun seriyi takvim ucundan alir; seri aralıktan bagimsiz, tum gecmisten. */
function takvimSunucusu(longestWeekStreak: number) {
  server.use(
    http.get('/api/stats/calendar', ({ request }) => {
      const url = new URL(request.url);
      return HttpResponse.json({
        from: url.searchParams.get('From'),
        to: url.searchParams.get('To'),
        days: [],
        trainedDayCount: 0,
        currentWeekStreak: 0,
        longestWeekStreak,
        thisWeekTrainedDays: 0,
        weeklyTargetDays: null,
        currentTargetStreak: null,
      });
    }),
  );
}

beforeEach(() => takvimSunucusu(0));

test('en uzun seri API degeriyle gosterilir, rekor olmasa da (#117)', async () => {
  takvimSunucusu(12);
  server.use(http.get('/api/records', () => HttpResponse.json([])));

  rekorlarSayfasiniOlustur();

  const seri = (await screen.findByText('En uzun seri')).parentElement as HTMLElement;
  expect(await within(seri).findByText('12 hafta')).toBeInTheDocument();
  expect(await screen.findByText('Henüz rekor yok')).toBeInTheDocument();
});

test('rekorlar listesi egzersiz basina en agir seti ve en cok tekrari AYRI AYRI gosterir', async () => {
  const rekorlar: ExerciseRecordResponse[] = [
    {
      exerciseId: 1,
      exerciseName: 'Bench Press',
      category: 'Push',
      bestWeight: 100,
      bestWeightReps: 3,
      bestWeightAt: '2026-08-01T10:00:00Z',
      bestReps: 12,
      bestRepsWeight: 60,
      bestRepsAt: '2026-07-15T10:00:00Z',
    },
  ];
  server.use(http.get('/api/records', () => HttpResponse.json(rekorlar)));

  rekorlarSayfasiniOlustur();

  const kart = (await screen.findByRole('heading', { name: 'Bench Press' })).closest('li');
  expect(kart).not.toBeNull();
  const kartIci = within(kart as HTMLElement);
  // Bu iki gercek FARKLI setler olabilir (spec) -- istemci hicbirini HESAPLAMAZ, sunucunun
  // verdigi degerleri oldugu gibi gosterir.
  const agirSatiri = within(kartIci.getByText('En ağır set').closest('div') as HTMLElement);
  expect(agirSatiri.getByText('· 01.08.2026')).toBeInTheDocument();
  expect(agirSatiri.getByText('100 kg')).toBeInTheDocument();
  expect(agirSatiri.getByText('× 3')).toBeInTheDocument();

  const tekrarSatiri = within(kartIci.getByText('En çok tekrar').closest('div') as HTMLElement);
  expect(tekrarSatiri.getByText('· 15.07.2026')).toBeInTheDocument();
  expect(tekrarSatiri.getByText('12 tekrar')).toBeInTheDocument();
  expect(tekrarSatiri.getByText('@ 60 kg')).toBeInTheDocument();
});

test('birden fazla egzersizin rekoru ayri ayri listelenir', async () => {
  const rekorlar: ExerciseRecordResponse[] = [
    {
      exerciseId: 1,
      exerciseName: 'Bench Press',
      category: 'Push',
      bestWeight: 100,
      bestWeightReps: 3,
      bestWeightAt: '2026-08-01T10:00:00Z',
      bestReps: 12,
      bestRepsWeight: 60,
      bestRepsAt: '2026-07-15T10:00:00Z',
    },
    {
      exerciseId: 2,
      exerciseName: 'Squat',
      category: 'Legs',
      bestWeight: 140,
      bestWeightReps: 5,
      bestWeightAt: '2026-06-01T10:00:00Z',
      bestReps: 15,
      bestRepsWeight: 100,
      bestRepsAt: '2026-05-01T10:00:00Z',
    },
  ];
  server.use(http.get('/api/records', () => HttpResponse.json(rekorlar)));

  rekorlarSayfasiniOlustur();

  expect(await screen.findByText('Bench Press')).toBeInTheDocument();
  expect(screen.getByText('Squat')).toBeInTheDocument();
});

test('hic rekor yoksa bos durum metni gorunur', async () => {
  server.use(http.get('/api/records', () => HttpResponse.json([])));

  rekorlarSayfasiniOlustur();

  expect(await screen.findByText('Henüz rekor yok')).toBeInTheDocument();
});

test('rekorlar istegi basarisiz olursa hata gosterilir, bos durum metni GORUNMEZ', async () => {
  server.use(
    http.get('/api/records', () =>
      HttpResponse.json({ title: 'Sunucu hatası', status: 500 }, { status: 500 }),
    ),
  );

  rekorlarSayfasiniOlustur();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Rekorlar alınamadı. Lütfen sayfayı yenileyin.',
  );
  expect(screen.queryByText('Henüz rekor yok')).not.toBeInTheDocument();
});
