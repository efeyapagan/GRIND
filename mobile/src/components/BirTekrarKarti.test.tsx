import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import BirTekrarKarti from './BirTekrarKarti';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

function kur(egzersizler: unknown[], hacimler: unknown[]) {
  requestMock.mockImplementation(async (path: string) => {
    if (path === '/exercises') return egzersizler;
    if (path.startsWith('/stats/volume/by-exercise')) return { from: null, to: null, totalVolume: 0, items: hacimler };
    if (path.startsWith('/stats/exercises/')) return { exerciseId: 1, exerciseName: 'x', points: [] };
    throw new Error(`beklenmeyen istek ${path}`);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BirTekrarKarti />
    </QueryClientProvider>,
  );
}

const BENCH = { id: 1, name: 'Bench Press', category: 'Push', measurement: 'WeightReps', isArchived: false, isGlobal: true, media: [] };
const CRUNCH = { id: 160, name: 'Crunch', category: 'Other', measurement: 'Reps', isArchived: false, isGlobal: true, media: [] };

/** #184: acilista en cok set atilan KILOLU hareket secili gelir -- daha cok set atilan crunch degil. */
test('varsayilan hareket en cok set atilan kilolu harekettir', async () => {
  await kur(
    [BENCH, CRUNCH],
    [
      { exerciseId: 160, exerciseName: 'Crunch', volume: 0, setCount: 40 },
      { exerciseId: 1, exerciseName: 'Bench Press', volume: 5000, setCount: 12 },
    ],
  );

  expect(await screen.findByRole('button', { name: 'Hareketi değiştir: Bench Press' })).toBeTruthy();
});

test('kilolu hareket yoksa aciklama gorunur', async () => {
  await kur([CRUNCH], [{ exerciseId: 160, exerciseName: 'Crunch', volume: 0, setCount: 40 }]);

  expect(await screen.findByText('Tahmini 1RM için kilolu bir hareket kaydet.')).toBeTruthy();
});
