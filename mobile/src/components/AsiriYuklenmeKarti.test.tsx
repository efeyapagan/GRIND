import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import AsiriYuklenmeKarti from './AsiriYuklenmeKarti';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

function kur(signal: unknown) {
  requestMock.mockImplementation(async (path: string) => {
    if (path === '/stats/overreaching') return { signal };
    throw new Error(`beklenmeyen istek ${path}`);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AsiriYuklenmeKarti />
    </QueryClientProvider>,
  );
}

/** #176: sinyal yanarken dusen hareketler, efor satirlari ve oneri gorunur. */
test('sinyal varken dusus ve efor satirlariyla kart cizilir', async () => {
  await kur({
    drops: [{ exerciseId: 1, exerciseName: 'Bench Press', previousBest: 112.5, recentBest: 104.06, dropPercent: 7.5 }],
    rirBefore: 2.5,
    rirRecent: 1,
    hardSessions: 3,
    ratedSessions: 4,
  });

  expect(await screen.findByText('Aşırı yüklenme sinyali')).toBeTruthy();
  expect(screen.getByText('Deload önerisi')).toBeTruthy();
  expect(screen.getByText('Bench Press · 112,5 → 104,06 kg (−7,5%)')).toBeTruthy();
  expect(screen.getByText('Ortalama RIR 2,5 → 1')).toBeTruthy();
  expect(screen.getByText('Son 2 haftada 3/4 antrenman Zor ya da Maksimal')).toBeTruthy();
});

/** RIR kurali degerlendirilemediyse (ortalamalar null) RIR satiri yok; zorlugu isaretli oturum yoksa o da yok. */
test('degerlendirilemeyen efor satirlari cizilmez', async () => {
  await kur({
    drops: [{ exerciseId: 1, exerciseName: 'Squat', previousBest: 150, recentBest: 140, dropPercent: 6.7 }],
    rirBefore: null,
    rirRecent: null,
    hardSessions: 0,
    ratedSessions: 0,
  });

  expect(await screen.findByText('Aşırı yüklenme sinyali')).toBeTruthy();
  expect(screen.queryByText(/Ortalama RIR/)).toBeNull();
  expect(screen.queryByText(/Son 2 haftada/)).toBeNull();
});

test('sinyal yokken hicbir sey cizilmez', async () => {
  await kur(null);

  await new Promise((r) => setTimeout(r, 50));
  expect(screen.queryByText('Aşırı yüklenme sinyali')).toBeNull();
  expect(screen.toJSON()).toBeNull();
});
