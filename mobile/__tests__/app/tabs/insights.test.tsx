import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useDeleteInsight,
  useGenerateInsight,
  useInfiniteInsights,
  useInsightGenerationState,
  type YorumSayfasi,
} from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import InsightsScreen from '../../../app/(tabs)/insights';

jest.mock('@grind/shared/api/queries', () => ({
  useGenerateInsight: jest.fn(),
  useDeleteInsight: jest.fn(),
  useInfiniteInsights: jest.fn(),
  useInsightGenerationState: jest.fn(),
}));

const useGenerateInsightMock = useGenerateInsight as jest.Mock;
const useDeleteInsightMock = useDeleteInsight as jest.Mock;
const useInfiniteInsightsMock = useInfiniteInsights as jest.Mock;
const useInsightGenerationStateMock = useInsightGenerationState as jest.Mock;

function ornekYorum(gecersizler: Partial<YorumSayfasi['items'][number]> = {}) {
  return {
    id: 1,
    content: 'Bench Press hacminde son iki haftada artış var.',
    createdAt: '2026-09-14T10:00:00Z',
    ...gecersizler,
  };
}

function sayfa(items: ReturnType<typeof ornekYorum>[], gecersizler: Partial<YorumSayfasi> = {}): YorumSayfasi {
  return { items, page: 1, pageSize: 25, totalCount: items.length, totalPages: 1, ...gecersizler };
}

/** `data`, `fetchNextPage` vb. gercekci bir `useInfiniteQuery` sonucunu taklit eder. */
function sonsuzSorguSonucu(sayfalar: YorumSayfasi[], gecersizler: Record<string, unknown> = {}) {
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
        <InsightsScreen />
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useGenerateInsightMock.mockReturnValue({ mutate: jest.fn(), isPending: false });
  useDeleteInsightMock.mockReturnValue({ mutate: jest.fn() });
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa([], { totalPages: 0 })]));
  useInsightGenerationStateMock.mockReturnValue({ uretiliyor: false, iptalEt: jest.fn() });
});

test('GRINDY maskotu erisilebilir adiyla gorunur (issue #239)', async () => {
  await ekraniOlustur();

  expect(screen.getByLabelText('GRINDY, antrenman koçun')).toBeTruthy();
});

test('hic yorum yoksa bos durum gorunur', async () => {
  await ekraniOlustur();

  expect(await screen.findByText('GRINDY henüz bir şey demedi')).toBeTruthy();
});

/**
 * Issue #148: "hazirlaniyor" gostergesi ekranin KENDI mutation'ina (`isPending`) degil, ekran
 * degisse de yasayan paylasilan duruma bagli. Ekrana yeni girilmis bir mount'ta mutation bos
 * (`isPending: false`) ama uretim suruyor olabilir.
 */
test('baska bir ekranda baslatilmis uretim surerken gosterge gorunur, sor dugmesi gizlenir', async () => {
  useInsightGenerationStateMock.mockReturnValue({ uretiliyor: true, iptalEt: jest.fn() });
  await ekraniOlustur();

  expect(await screen.findByText(/GRINDY düşünüyor/)).toBeTruthy();
  expect(screen.queryByText("GRINDY'ye sor")).toBeNull();
});

test('Vazgec devam eden uretimin beklemesini durdurur', async () => {
  const iptalEt = jest.fn();
  useInsightGenerationStateMock.mockReturnValue({ uretiliyor: true, iptalEt });
  await ekraniOlustur();

  fireEvent.press(await screen.findByText('Vazgeç'));

  expect(iptalEt).toHaveBeenCalledTimes(1);
});

test('iki sayfanin yorumlari birlikte, ust uste yazmadan listelenir', async () => {
  useInfiniteInsightsMock.mockReturnValue(
    sonsuzSorguSonucu([
      sayfa([ornekYorum({ id: 1, content: 'Sayfa1Yorum' })], { page: 1, totalPages: 2 }),
      sayfa([ornekYorum({ id: 2, content: 'Sayfa2Yorum' })], { page: 2, totalPages: 2 }),
    ]),
  );
  await ekraniOlustur();

  expect(await screen.findByText('Sayfa1Yorum')).toBeTruthy();
  expect(screen.getByText('Sayfa2Yorum')).toBeTruthy();
});

test('listenin sonuna gelinince (onEndReached) hasNextPage true iken fetchNextPage cagrilir', async () => {
  const sonuc = sonsuzSorguSonucu([sayfa([ornekYorum()], { page: 1, totalPages: 2 })]);
  useInfiniteInsightsMock.mockReturnValue(sonuc);
  await ekraniOlustur();
  await screen.findByText(ornekYorum().content);

  fireEvent(screen.getByTestId('yorum-liste'), 'endReached');

  expect(sonuc.fetchNextPage).toHaveBeenCalledTimes(1);
});

test('son sayfadaysa (hasNextPage false) onEndReached tetiklense de fetchNextPage cagrilmaz', async () => {
  const sonuc = sonsuzSorguSonucu([sayfa([ornekYorum()], { page: 1, totalPages: 1 })]);
  useInfiniteInsightsMock.mockReturnValue(sonuc);
  await ekraniOlustur();
  await screen.findByText(ornekYorum().content);

  fireEvent(screen.getByTestId('yorum-liste'), 'endReached');

  expect(sonuc.fetchNextPage).not.toHaveBeenCalled();
});
