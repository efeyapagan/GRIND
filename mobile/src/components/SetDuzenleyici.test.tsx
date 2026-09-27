import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys, type Egzersiz, type SetKaydi } from '@grind/shared/api/queries';
import SetDuzenleyici from './SetDuzenleyici';

jest.mock('@grind/shared/api/client', () => ({
  request: jest.fn().mockRejectedValue(new Error('Testte ag istegi beklenmiyor')),
  setUnauthorizedHandler: jest.fn(),
}));

const DUMBBELL: Egzersiz = {
  id: 1,
  name: 'Incline Dumbbell Press',
  alternateName: null,
  category: 'Push',
  equipment: 'Dumbbell',
};

const KAYIT: SetKaydi = {
  id: 7,
  sessionId: 1,
  exerciseId: DUMBBELL.id,
  exerciseName: DUMBBELL.name,
  exercisePosition: 1,
  weight: 22.5,
  reps: 10,
  durationSeconds: null,
  recordType: 'None',
  rir: null,
  createdAt: new Date(Date.UTC(2026, 8, 26, 10, 0)).toISOString(),
  restSeconds: null,
  measurement: 'WeightReps',
};

// #413: ibare iki set giris kutusunda da gorunur -- duzeltirken de ayni soru soruluyor.
test('set duzenleyicide de dumbbell hareketinin agirlik kutusu "Teki" yazar', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(queryKeys.exercises, [DUMBBELL]);

  await render(
    <QueryClientProvider client={queryClient}>
      <SetDuzenleyici kayit={KAYIT} sira={1} onKapat={() => undefined} onSil={() => undefined} />
    </QueryClientProvider>,
  );

  expect(screen.getByText('Teki')).toBeTruthy();
});
