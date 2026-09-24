import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAddMeasurement,
  useDeleteMeasurement,
  useInfiniteMeasurements,
  useUpdateMeasurement,
  type OlcuSayfasi,
} from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import MeasurementsScreen from '../../../../app/(tabs)/profile/measurements';

jest.mock('@grind/shared/api/queries', () => ({
  useAddMeasurement: jest.fn(),
  useDeleteMeasurement: jest.fn(),
  useInfiniteMeasurements: jest.fn(),
  useUpdateMeasurement: jest.fn(),
}));

const useAddMeasurementMock = useAddMeasurement as jest.Mock;
const useDeleteMeasurementMock = useDeleteMeasurement as jest.Mock;
const useInfiniteMeasurementsMock = useInfiniteMeasurements as jest.Mock;
const useUpdateMeasurementMock = useUpdateMeasurement as jest.Mock;

function ornekOlcu(gecersizler: Partial<OlcuSayfasi['items'][number]> = {}) {
  return {
    id: 1,
    weight: 82.4,
    heightCm: 180,
    bodyFatPercent: null,
    waistCm: null,
    hipCm: null,
    recordedAt: '2026-09-18T10:00:00Z',
    ...gecersizler,
  };
}

function sayfa(items: ReturnType<typeof ornekOlcu>[], gecersizler: Partial<OlcuSayfasi> = {}): OlcuSayfasi {
  return { items, page: 1, pageSize: 25, totalCount: items.length, totalPages: 1, ...gecersizler };
}

/** `data`, `fetchNextPage` vb. gercekci bir `useInfiniteQuery` sonucunu taklit eder. */
function sonsuzSorguSonucu(sayfalar: OlcuSayfasi[], gecersizler: Record<string, unknown> = {}) {
  const sonSayfa = sayfalar[sayfalar.length - 1];
  return {
    data: { pages: sayfalar, pageParams: sayfalar.map((s) => s.page) },
    isLoading: false,
    isError: false,
    fetchNextPage: jest.fn(),
    hasNextPage: sonSayfa ? sonSayfa.page < sonSayfa.totalPages : false,
    isFetchingNextPage: false,
    ...gecersizler,
  };
}

function bosSayfa() {
  return sayfa([], { totalPages: 0 });
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
  useUpdateMeasurementMock.mockReturnValue({ mutate: jest.fn(), isPending: false });
  useInfiniteMeasurementsMock.mockReturnValue(sonsuzSorguSonucu([bosSayfa()]));
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

describe('ayni gun ikinci olcum sorusu (#260)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-18T18:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('farkli degerli ikinci olcumde soru cikar, "Ekstra ölçüm" normal istek atar', async () => {
    const mutate = jest.fn((govde, { onSuccess }) => onSuccess());
    useAddMeasurementMock.mockReturnValue({ mutate, isPending: false });
    useInfiniteMeasurementsMock.mockReturnValue(
      sonsuzSorguSonucu([sayfa([ornekOlcu({ id: 1, recordedAt: '2026-09-18T10:00:00Z' })])]),
    );
    await ekraniOlustur();

    await fireEvent.press(screen.getByRole('button', { name: 'Yeni ölçüm ekle' }));
    await fireEvent.changeText(screen.getByLabelText('Boy'), '180');
    await fireEvent.changeText(screen.getByLabelText('Kilo'), '79.5');
    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByText('Bugün için başka bir ölçüm girdiniz.')).toBeTruthy();
    expect(screen.queryByLabelText('Boy')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Ekstra ölçüm' }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 79.5, heightCm: 180 }),
      expect.anything(),
    );
    await waitFor(() => expect(screen.queryByText('Bugün için başka bir ölçüm girdiniz.')).toBeNull());
  });

  test('"Yerine kaydet" gunun EN SON olcumunu PATCH ile gunceller', async () => {
    const guncelleMutate = jest.fn((govde, { onSuccess }) => onSuccess());
    useUpdateMeasurementMock.mockReturnValue({ mutate: guncelleMutate, isPending: false });
    useInfiniteMeasurementsMock.mockReturnValue(
      sonsuzSorguSonucu([
        sayfa([
          ornekOlcu({ id: 5, weight: 80, recordedAt: '2026-09-18T15:00:00Z' }),
          ornekOlcu({ id: 1, weight: 81, recordedAt: '2026-09-18T09:00:00Z' }),
        ]),
      ]),
    );
    await ekraniOlustur();

    await fireEvent.press(screen.getByRole('button', { name: 'Yeni ölçüm ekle' }));
    await fireEvent.changeText(screen.getByLabelText('Boy'), '180');
    await fireEvent.changeText(screen.getByLabelText('Kilo'), '79.5');
    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Yerine kaydet' }));

    expect(guncelleMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, weight: 79.5, heightCm: 180 }),
      expect.anything(),
    );
  });

  test('"Vazgeç" soruyu kapatir, form degerleri korunur, hicbir istek gitmez', async () => {
    const ekleMutate = jest.fn();
    useAddMeasurementMock.mockReturnValue({ mutate: ekleMutate, isPending: false });
    useInfiniteMeasurementsMock.mockReturnValue(
      sonsuzSorguSonucu([sayfa([ornekOlcu({ id: 1, recordedAt: '2026-09-18T10:00:00Z' })])]),
    );
    await ekraniOlustur();

    await fireEvent.press(screen.getByRole('button', { name: 'Yeni ölçüm ekle' }));
    await fireEvent.changeText(screen.getByLabelText('Boy'), '180');
    await fireEvent.changeText(screen.getByLabelText('Kilo'), '79.5');
    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

    await fireEvent.press(await screen.findByText('Vazgeç'));

    expect(screen.getByText('Yeni ölçüm')).toBeTruthy();
    expect(screen.getByLabelText('Boy').props.value).toBe('180');
    expect(screen.getByLabelText('Kilo').props.value).toBe('79.5');
    expect(ekleMutate).not.toHaveBeenCalled();
  });

  test('tam ayni boy+kiloyla ikinci giriste soru CIKMAZ, sunucu 409 doner (#119 davranisi degismedi)', async () => {
    const { ApiError } = jest.requireActual('@grind/shared/api/problem');
    const mutate = jest.fn((govde, { onError }) =>
      onError(new ApiError(409, 'Bu gün için aynı boy ve kiloyla bir ölçüm zaten kayıtlı.')),
    );
    useAddMeasurementMock.mockReturnValue({ mutate, isPending: false });
    useInfiniteMeasurementsMock.mockReturnValue(
      sonsuzSorguSonucu([
        sayfa([ornekOlcu({ id: 1, weight: 82.4, heightCm: 180, recordedAt: '2026-09-18T10:00:00Z' })]),
      ]),
    );
    await ekraniOlustur();

    await fireEvent.press(screen.getByRole('button', { name: 'Yeni ölçüm ekle' }));
    await fireEvent.changeText(screen.getByLabelText('Boy'), '180');
    await fireEvent.changeText(screen.getByLabelText('Kilo'), '82.4');
    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByText('Bu gün için aynı boy ve kiloyla bir ölçüm zaten kayıtlı.')).toBeTruthy();
    expect(screen.queryByText('Bugün için başka bir ölçüm girdiniz.')).toBeNull();
  });
});

test('olcu silme once onay ister, Vazgec ile istek atilmaz', async () => {
  const mutate = jest.fn();
  useDeleteMeasurementMock.mockReturnValue({ mutate });
  useInfiniteMeasurementsMock.mockReturnValue(sonsuzSorguSonucu([sayfa([ornekOlcu()])]));
  await ekraniOlustur();

  await fireEvent.press(screen.getByRole('button', { name: 'Ölçüyü sil' }));
  expect(screen.getByText('Bu ölçü kalıcı olarak silinecek.')).toBeTruthy();

  await fireEvent.press(screen.getByText('Vazgeç'));

  expect(screen.queryByText('Bu ölçü kalıcı olarak silinecek.')).toBeNull();
  expect(mutate).not.toHaveBeenCalled();
});

test('iki sayfanin olculeri birlikte, ust uste yazmadan listelenir', async () => {
  useInfiniteMeasurementsMock.mockReturnValue(
    sonsuzSorguSonucu([
      sayfa([ornekOlcu({ id: 1, weight: 80 })], { page: 1, totalPages: 2 }),
      sayfa([ornekOlcu({ id: 2, weight: 79 })], { page: 2, totalPages: 2 }),
    ]),
  );
  await ekraniOlustur();

  expect(await screen.findByText(/80 kg/)).toBeTruthy();
  expect(screen.getByText(/79 kg/)).toBeTruthy();
});

test('listenin sonuna gelinince (onEndReached) hasNextPage true iken fetchNextPage cagrilir', async () => {
  const sonuc = sonsuzSorguSonucu([sayfa([ornekOlcu()], { page: 1, totalPages: 2 })]);
  useInfiniteMeasurementsMock.mockReturnValue(sonuc);
  await ekraniOlustur();
  await screen.findByText(/82\.4 kg/);

  fireEvent(screen.getByTestId('olcu-liste'), 'endReached');

  expect(sonuc.fetchNextPage).toHaveBeenCalledTimes(1);
});

test('son sayfadaysa (hasNextPage false) onEndReached tetiklense de fetchNextPage cagrilmaz', async () => {
  const sonuc = sonsuzSorguSonucu([sayfa([ornekOlcu()], { page: 1, totalPages: 1 })]);
  useInfiniteMeasurementsMock.mockReturnValue(sonuc);
  await ekraniOlustur();
  await screen.findByText(/82\.4 kg/);

  fireEvent(screen.getByTestId('olcu-liste'), 'endReached');

  expect(sonuc.fetchNextPage).not.toHaveBeenCalled();
});
