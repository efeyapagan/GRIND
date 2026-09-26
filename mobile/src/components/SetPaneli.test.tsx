import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys, type Egzersiz } from '@grind/shared/api/queries';
import SetPaneli from './SetPaneli';

jest.mock('@grind/shared/api/client', () => ({
  request: jest.fn().mockRejectedValue(new Error('Testte ag istegi beklenmiyor')),
  setUnauthorizedHandler: jest.fn(),
}));

function egzersiz(id: number, name: string, equipment: Egzersiz['equipment']): Egzersiz {
  return { id, name, alternateName: null, category: 'Push', equipment };
}

/**
 * Panel hareket listesini onbellekten okur (`useExercises`); testte listeyi dogrudan yaziyoruz ki
 * ag katmani hic devreye girmesin.
 */
async function paneliCiz(secili: Egzersiz) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(queryKeys.exercises, [secili]);
  return render(
    <QueryClientProvider client={queryClient}>
      <SetPaneli egzersizId={secili.id} egzersizAdi={secili.name} onSetEklendi={() => undefined} />
    </QueryClientProvider>,
  );
}

// #413: dumbbell ve makine hareketlerinde "kg" tek tarafin mi toplamin mi agirligi belirsizdi.
test('dumbbell hareketinde agirlik kutusu "Teki" yazar', async () => {
  await paneliCiz(egzersiz(1, 'Incline Dumbbell Press', 'Dumbbell'));

  expect(screen.getByText('Teki')).toBeTruthy();
});

test('makine hareketinde agirlik kutusu "Toplam" yazar', async () => {
  await paneliCiz(egzersiz(2, 'Leg Press', 'Machine'));

  expect(screen.getByText('Toplam')).toBeTruthy();
});

test('barbell hareketinde ibare cizilmez', async () => {
  await paneliCiz(egzersiz(3, 'Bench Press', 'Barbell'));

  expect(screen.queryByText('Teki')).toBeNull();
  expect(screen.queryByText('Toplam')).toBeNull();
  // Kutu bugunku gibi kalir: birim yazisi yerinde.
  expect(screen.getByText('kg')).toBeTruthy();
});
