import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddMeasurement, useDeleteMeasurement, useMeasurements } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import MeasurementsScreen from '../../../../app/(tabs)/profile/measurements';

jest.mock('@grind/shared/api/queries', () => ({
  useAddMeasurement: jest.fn(),
  useDeleteMeasurement: jest.fn(),
  useMeasurements: jest.fn(),
}));

const useAddMeasurementMock = useAddMeasurement as jest.Mock;
const useDeleteMeasurementMock = useDeleteMeasurement as jest.Mock;
const useMeasurementsMock = useMeasurements as jest.Mock;

function bosSayfa() {
  return { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 1 };
}

function ekraniOlustur() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PageTitleProvider>
        <MeasurementsScreen />
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAddMeasurementMock.mockReturnValue({ mutate: jest.fn(), isPending: false });
  useDeleteMeasurementMock.mockReturnValue({ mutate: jest.fn() });
  useMeasurementsMock.mockReturnValue({ data: bosSayfa(), isLoading: false, isError: false });
});

test('hic olcu yoksa bos durum gorunur', async () => {
  await ekraniOlustur();

  expect(await screen.findByText('Henüz ölçü yok')).toBeTruthy();
});

test('pencere acilir, boy/kilo olmadan gonderilirse alan hatalari cikar, istek atilmaz', async () => {
  const mutate = jest.fn();
  useAddMeasurementMock.mockReturnValue({ mutate, isPending: false });
  await ekraniOlustur();

  await fireEvent.press(screen.getByRole('button', { name: 'Yeni ölçüm ekle' }));
  expect(screen.getByText('Yeni ölçüm')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Kilo gerekli.')).toBeTruthy();
  expect(screen.getByText('Boy gerekli.')).toBeTruthy();
  expect(mutate).not.toHaveBeenCalled();
});

test('boy ve kilo doldurulunca dogru govdeyle istek atilir', async () => {
  const mutate = jest.fn((govde, { onSuccess }) => onSuccess());
  useAddMeasurementMock.mockReturnValue({ mutate, isPending: false });
  await ekraniOlustur();

  await fireEvent.press(screen.getByRole('button', { name: 'Yeni ölçüm ekle' }));
  await fireEvent.changeText(screen.getByLabelText('Boy'), '180');
  await fireEvent.changeText(screen.getByLabelText('Kilo'), '82.4');
  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

  expect(mutate).toHaveBeenCalledWith(
    expect.objectContaining({ weight: 82.4, heightCm: 180 }),
    expect.anything(),
  );
  await waitFor(() => expect(screen.queryByText('Yeni ölçüm')).toBeNull());
});

test('409 hatasinda genel hata kutusu gosterilir, pencere acik kalir', async () => {
  const { ApiError } = jest.requireActual('@grind/shared/api/problem');
  const mutate = jest.fn((govde, { onError }) =>
    onError(new ApiError(409, 'Bu gün için aynı boy ve kiloyla bir ölçüm zaten kayıtlı.')),
  );
  useAddMeasurementMock.mockReturnValue({ mutate, isPending: false });
  await ekraniOlustur();

  await fireEvent.press(screen.getByRole('button', { name: 'Yeni ölçüm ekle' }));
  await fireEvent.changeText(screen.getByLabelText('Boy'), '180');
  await fireEvent.changeText(screen.getByLabelText('Kilo'), '82.4');
  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Bu gün için aynı boy ve kiloyla bir ölçüm zaten kayıtlı.')).toBeTruthy();
  expect(screen.getByText('Yeni ölçüm')).toBeTruthy();
});

test('olcu silme once onay ister, Vazgec ile istek atilmaz', async () => {
  const mutate = jest.fn();
  useDeleteMeasurementMock.mockReturnValue({ mutate });
  useMeasurementsMock.mockReturnValue({
    data: {
      items: [{ id: 1, weight: 82.4, heightCm: 180, bodyFatPercent: null, waistCm: null, hipCm: null, recordedAt: '2026-09-18T10:00:00Z' }],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
    },
    isLoading: false,
    isError: false,
  });
  await ekraniOlustur();

  await fireEvent.press(screen.getByRole('button', { name: 'Ölçüyü sil' }));
  expect(screen.getByText('Bu ölçü kalıcı olarak silinecek.')).toBeTruthy();

  await fireEvent.press(screen.getByText('Vazgeç'));

  expect(screen.queryByText('Bu ölçü kalıcı olarak silinecek.')).toBeNull();
  expect(mutate).not.toHaveBeenCalled();
});
