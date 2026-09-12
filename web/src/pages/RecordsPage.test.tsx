import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import RecordsPage from './RecordsPage';
import type { components } from '../api/schema';

type ExerciseRecordResponse = components['schemas']['ExerciseRecordResponse'];

function testeOzelSorguIstemcisi(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function rekorlarSayfasiniOlustur() {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <RecordsPage />
    </QueryClientProvider>,
  );
}

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

  expect(await screen.findByText('Bench Press')).toBeInTheDocument();
  // Bu iki gercek FARKLI setler olabilir (spec) -- istemci hicbirini HESAPLAMAZ, sunucunun
  // verdigi degerleri oldugu gibi gosterir.
  expect(screen.getByText('En ağır set: 100 × 3 (01.08.2026)')).toBeInTheDocument();
  expect(screen.getByText('En çok tekrar: 12 × 60 (15.07.2026)')).toBeInTheDocument();
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

  expect(await screen.findByText('Henüz rekor yok.')).toBeInTheDocument();
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
  expect(screen.queryByText('Henüz rekor yok.')).not.toBeInTheDocument();
});
