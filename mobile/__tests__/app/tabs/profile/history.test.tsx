import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { oturumSilindiTazele, oturumuSil, useInfiniteHistory, type GecmisSayfasi } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import HistoryScreen from '../../../../app/(tabs)/profile/history';

jest.mock('@grind/shared/api/queries', () => ({
  useInfiniteHistory: jest.fn(),
  oturumuSil: jest.fn(),
  oturumSilindiTazele: jest.fn(),
}));

const useInfiniteHistoryMock = useInfiniteHistory as jest.Mock;

function ornekOturum(gecersizler: Partial<GecmisSayfasi['items'][number]> = {}) {
  return {
    sessionId: 1,
    startedAt: '2026-09-10T08:00:00Z',
    templateName: null,
    totalVolume: 1000,
    setCount: 3,
    medianRestSeconds: null,
    sets: [],
    ...gecersizler,
  };
}

function sayfa(items: ReturnType<typeof ornekOturum>[], gecersizler: Partial<GecmisSayfasi> = {}): GecmisSayfasi {
  return { items, page: 1, pageSize: 25, totalCount: items.length, totalPages: 1, ...gecersizler };
}

/** `data`, `fetchNextPage` vb. gercekci bir `useInfiniteQuery` sonucunu taklit eder. */
function sonsuzSorguSonucu(sayfalar: GecmisSayfasi[], gecersizler: Record<string, unknown> = {}) {
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

function ekraniOlustur() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PageTitleProvider>
        <HistoryScreen />
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  (oturumuSil as jest.Mock).mockResolvedValue(undefined);
  (oturumSilindiTazele as jest.Mock).mockReturnValue(undefined);
});

test('hic oturum yoksa bos durum gorunur, Onceki/Sonraki dugmesi yok', async () => {
  useInfiniteHistoryMock.mockReturnValue(sonsuzSorguSonucu([sayfa([], { totalPages: 0 })]));
  await ekraniOlustur();

  expect(await screen.findByText('Henüz antrenman geçmişi yok')).toBeTruthy();
  expect(screen.queryByText('Önceki')).toBeNull();
  expect(screen.queryByText('Sonraki')).toBeNull();
});

test('yorum ekranina giden baglanti GRINDY adini tasir (issue #239)', async () => {
  useInfiniteHistoryMock.mockReturnValue(sonsuzSorguSonucu([sayfa([], { totalPages: 0 })]));
  await ekraniOlustur();

  expect(await screen.findByText('GRINDY ne diyor?')).toBeTruthy();
});

test('iki sayfanin oturumlari birlikte, ust uste yazmadan listelenir', async () => {
  useInfiniteHistoryMock.mockReturnValue(
    sonsuzSorguSonucu([
      sayfa([ornekOturum({ sessionId: 1, templateName: 'Sayfa1Antrenman' })], { page: 1, totalPages: 2 }),
      sayfa([ornekOturum({ sessionId: 2, templateName: 'Sayfa2Antrenman' })], { page: 2, totalPages: 2 }),
    ]),
  );
  await ekraniOlustur();

  expect(await screen.findByText('Sayfa1Antrenman')).toBeTruthy();
  expect(screen.getByText('Sayfa2Antrenman')).toBeTruthy();
});

test('listenin sonuna gelinince (onEndReached) hasNextPage true iken fetchNextPage cagrilir', async () => {
  const sonuc = sonsuzSorguSonucu([sayfa([ornekOturum()], { page: 1, totalPages: 2 })]);
  useInfiniteHistoryMock.mockReturnValue(sonuc);
  await ekraniOlustur();
  await screen.findByText('Serbest'); // ekran render olsun diye bekle

  fireEvent(screen.getByTestId('gecmis-liste'), 'endReached');

  expect(sonuc.fetchNextPage).toHaveBeenCalledTimes(1);
});

test('son sayfadaysa (hasNextPage false) onEndReached tetiklense de fetchNextPage cagrilmaz', async () => {
  const sonuc = sonsuzSorguSonucu([sayfa([ornekOturum()], { page: 1, totalPages: 1 })]);
  useInfiniteHistoryMock.mockReturnValue(sonuc);
  await ekraniOlustur();
  await screen.findByText('Serbest');

  fireEvent(screen.getByTestId('gecmis-liste'), 'endReached');

  expect(sonuc.fetchNextPage).not.toHaveBeenCalled();
});
