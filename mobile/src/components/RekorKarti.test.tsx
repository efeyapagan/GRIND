import { render as rtlRender, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys, type EgzersizRekoru } from '@grind/shared/api/queries';
import RekorKarti from './RekorKarti';

// #647: kart kardiyo mesafesinin birimini hareket listesinin onbelleginden okur.
function render(oge: React.ReactElement, egzersizler: unknown[] = []) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  queryClient.setQueryData(queryKeys.exercises, egzersizler);
  return rtlRender(<QueryClientProvider client={queryClient}>{oge}</QueryClientProvider>);
}

const rekor: EgzersizRekoru = {
  exerciseId: 3,
  exerciseName: 'Bench Press',
  bestWeight: 100,
  bestWeightReps: 3,
  bestWeightAt: '2026-09-20T09:00:00Z',
  bestReps: 12,
  bestRepsWeight: 60,
  bestRepsAt: '2026-09-21T09:00:00Z',
  measurement: 'WeightReps',
  bestDurationSeconds: null,
  bestDistanceKm: null,
  bestDistanceAt: null,
};

/**
 * #591: rekor karti duz `bg-surface-2` degil cam kart (spec Karar 9; gecmis kartiyla ayni kose); icindeki
 * olcu kutulari (en agir set, en cok tekrar) opak `surface-1` kutu degil camin ustunde hafif dolgu.
 */
test('rekor karti cam yuzeydedir, icindeki olcu kutulari opak kutu cizmez', async () => {
  await render(<RekorKarti rekor={rekor} />);

  const sinif: string = screen.getByTestId('rekor-karti-3').props.className;
  expect(sinif).toContain('rounded-3xl');
  expect(sinif).not.toMatch(/bg-surface/);
  expect(screen.getAllByTestId('rekor-olcusu')).toHaveLength(2);
  for (const kutu of screen.getAllByTestId('rekor-olcusu')) {
    expect(kutu.props.className).not.toMatch(/bg-surface/);
  }
});

/** #615: olcu satirlari camin icinde kutu degil (dolgu yok); aralarinda sac teli cizgi var. */
test('rekor olculeri dolgusuzdur, aralarinda tek cizgi vardir', async () => {
  await render(<RekorKarti rekor={rekor} />);

  expect(screen.queryAllByTestId('cam-dolgu')).toHaveLength(0);
  expect(screen.getAllByTestId('cam-ayirici')).toHaveLength(1);
});

/** #647: kardiyoda en uzun sure ve en uzun mesafe; kurek ergometresi (damper + mesafe) mesafeyi metre yazar. */
test('kardiyo rekorunda en uzun sure ve mesafe gorunur, kurekte mesafe metredir', async () => {
  const kurek: EgzersizRekoru = {
    ...rekor,
    exerciseId: 202,
    exerciseName: 'Rowing Machine',
    measurement: 'Cardio',
    bestDurationSeconds: 1200,
    bestDistanceKm: 5,
    bestDistanceAt: '2026-09-22T09:00:00Z',
  };
  await render(<RekorKarti rekor={kurek} />, [
    { id: 202, name: 'Rowing Machine', category: 'Cardio', measurement: 'Cardio', cardioFields: ['Damper', 'Distance', 'Cadence', 'Watts'] },
  ]);

  expect(screen.getByText('20:00')).toBeTruthy();
  expect(screen.getByText('5.000 m')).toBeTruthy();
  expect(screen.queryByText(/tekrar/i)).toBeNull();
});

