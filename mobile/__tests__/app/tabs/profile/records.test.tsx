import { render, screen, within } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGuncelTakvimOzeti, usePlatolar, useRecords } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import RecordsScreen from '../../../../app/(tabs)/profile/records';

jest.mock('@grind/shared/api/queries', () => ({
  useRecords: jest.fn(),
  useGuncelTakvimOzeti: jest.fn(),
  usePlatolar: jest.fn(),
}));

function rekor(exerciseId: number, exerciseName: string) {
  return {
    exerciseId,
    exerciseName,
    category: 'Push',
    bestWeight: 100,
    bestWeightReps: 5,
    bestWeightAt: '2026-07-15T10:00:00Z',
    bestReps: 12,
    bestRepsWeight: 60,
    bestRepsAt: '2026-07-15T10:00:00Z',
  };
}

function ekraniOlustur() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PageTitleProvider>
        <RecordsScreen />
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

/** web RecordsPage.test.tsx'teki #72 testinin mobil karsiligi: rozet ve metin sunucunun degerinden. */
test('platodaki hareketin kartinda plato rozeti ve sunucunun verdigi sure/1RM gorunur, digerlerinde gorunmez (#72)', async () => {
  (useRecords as jest.Mock).mockReturnValue({
    data: [rekor(1, 'Bench Press'), rekor(2, 'Squat')],
    isLoading: false,
    isError: false,
  });
  (useGuncelTakvimOzeti as jest.Mock).mockReturnValue({ data: undefined });
  (usePlatolar as jest.Mock).mockReturnValue({
    data: [{ exerciseId: 1, exerciseName: 'Bench Press', bestOneRepMax: 112.5, bestOn: '2026-07-15', weeks: 8 }],
  });

  await ekraniOlustur();

  const bench = within(screen.getByTestId('rekor-karti-1'));
  expect(bench.getByText('Plato')).toBeTruthy();
  expect(bench.getByText('8 haftadır ilerleme yok · tahmini 1RM 112,5 kg')).toBeTruthy();

  expect(within(screen.getByTestId('rekor-karti-2')).queryByText('Plato')).toBeNull();
});
