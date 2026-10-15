import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys, type KardiyoKaydi } from '@grind/shared/api/queries';
import { BOS_KARDIYO_DEGERLERI } from '@grind/shared/lib/kardiyo';
import KardiyoSatiri from './KardiyoSatiri';

function ciz(kayit: KardiyoKaydi) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  queryClient.setQueryData(queryKeys.exercises, [
    { id: 193, name: 'Treadmill', category: 'Cardio', measurement: 'Cardio', cardioFields: ['Speed', 'Incline', 'Distance'] },
  ]);
  return render(
    <QueryClientProvider client={queryClient}>
      <KardiyoSatiri kayit={kayit} onDuzenle={jest.fn()} />
    </QueryClientProvider>,
  );
}

const KOSU: KardiyoKaydi = {
  ...BOS_KARDIYO_DEGERLERI,
  id: 7,
  sessionId: 5,
  exerciseId: 193,
  exerciseName: 'Treadmill',
  startedAt: '2026-10-15T10:00:00Z',
  durationSeconds: 1200,
  speedKmh: 9,
  inclinePercent: 6,
  distanceKm: 3.2,
  isDurationRecord: false,
  isDistanceRecord: true,
};

/** #647: bitmis kayit sure, dolu kutularin ozeti ve rekor rozetiyle yazilir. */
test('bitmis kayit ozet ve mesafe rekoru rozetiyle cizilir', async () => {
  await ciz(KOSU);

  expect(screen.getByText('20:00')).toBeTruthy();
  expect(screen.getByText('3,2 km · 9 km/sa · %6')).toBeTruthy();
  expect(screen.getByText('Mesafe rekoru')).toBeTruthy();
  expect(screen.queryByText('Süre rekoru')).toBeNull();
});

test('akan kayit canli sure ve Suruyor hapiyla cizilir, duzenlenemez', async () => {
  jest.useFakeTimers({ now: Date.parse('2026-10-15T10:05:00Z') });
  await ciz({ ...KOSU, durationSeconds: null, isDistanceRecord: false });

  expect(screen.getByText('5:00')).toBeTruthy();
  expect(screen.getByText('Sürüyor')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  jest.useRealTimers();
});
