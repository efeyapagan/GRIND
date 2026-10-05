import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAntrenmanSayisi,
  useDeleteInsight,
  useGenerateInsight,
  useInfiniteInsights,
  useInsightGenerationState,
  type YorumSayfasi,
} from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import { i18n } from '@grind/shared/i18n';
import InsightsScreen from '../../../app/(tabs)/insights';

let mockYorumDili = 'tr';
jest.mock('../../../src/ui/YorumDiliContext', () => ({
  useYorumDili: () => ({ yorumDili: mockYorumDili, yorumDiliniSec: jest.fn(), hazir: true }),
}));

const mockBasliklar: string[] = [];
jest.mock('@grind/shared/pageTitle', () => ({
  ...jest.requireActual('@grind/shared/pageTitle'),
  usePageTitle: (baslik: string) => {
    mockBasliklar.push(baslik);
  },
}));

jest.mock('@grind/shared/api/queries', () => ({
  // Saf bir yardimci: sahtesi gercegini taklit etmek yerine gercegi kullanilir.
  yorumMetni: jest.requireActual('@grind/shared/api/queries').yorumMetni,
  useGenerateInsight: jest.fn(),
  useAntrenmanSayisi: jest.fn(),
  useDeleteInsight: jest.fn(),
  useInfiniteInsights: jest.fn(),
  useInsightGenerationState: jest.fn(),
}));

const useGenerateInsightMock = useGenerateInsight as jest.Mock;
const useAntrenmanSayisiMock = useAntrenmanSayisi as jest.Mock;
const useDeleteInsightMock = useDeleteInsight as jest.Mock;
const useInfiniteInsightsMock = useInfiniteInsights as jest.Mock;
const useInsightGenerationStateMock = useInsightGenerationState as jest.Mock;

function ornekYorum(
  gecersizler: Partial<YorumSayfasi['items'][number]> = {},
): YorumSayfasi['items'][number] {
  return {
    id: 1,
    translations: [
      { language: 'tr', content: 'Bench Press hacminde son iki haftada artış var.' },
      { language: 'en', content: 'Bench Press volume rose over the last two weeks.' },
    ],
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
  useAntrenmanSayisiMock.mockReturnValue({ data: 12 });
  useGenerateInsightMock.mockReturnValue({ mutate: jest.fn(), isPending: false });
  useDeleteInsightMock.mockReturnValue({ mutate: jest.fn() });
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa([], { totalPages: 0 })]));
  useInsightGenerationStateMock.mockReturnValue({ uretiliyor: false, iptalEt: jest.fn() });
  mockYorumDili = 'tr';
  mockBasliklar.length = 0;
});

// ---- Cok dilli yorum (#199) ----

/**
 * #199 kullanici karari: ekranin basligi artik yalnizca "GRINDY". Baslik basligi KABUK cizer,
 * bu ekran degil -- bu yuzden saglayiciya ne verildigi sinanir.
 */
test('ekran basligi GRINDY', async () => {
  await ekraniOlustur();

  expect(mockBasliklar).toContain('GRINDY');
});

test('secili yorum dilinin cevirisi gosterilir', async () => {
  mockYorumDili = 'en';
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa([ornekYorum()])]));

  await ekraniOlustur();

  expect(screen.getByText('Bench Press volume rose over the last two weeks.')).toBeTruthy();
  expect(screen.queryByText('Bench Press hacminde son iki haftada artış var.')).toBeNull();
});

/**
 * KRITIK: her uretim zaten butun dilleri icerir, bu yuzden dil degistirmek YENI BIR ISTEK
 * ATMAZ -- yeni istek yeni bir LLM ucreti demek olurdu.
 */
test('dil degistirmek yeni istek atmaz', async () => {
  const sonuc = sonsuzSorguSonucu([sayfa([ornekYorum()])]);
  useInfiniteInsightsMock.mockReturnValue(sonuc);
  mockYorumDili = 'en';

  await ekraniOlustur();

  // Dil, SORGUNUN bir parcasi olmamali: olsaydi her dil degisimi yeni bir istek (ve yeni bir
  // onbellek anahtari) uretirdi. Yorumlar zaten butun dilleri tasiyor.
  expect(useInfiniteInsightsMock.mock.calls.length).toBeGreaterThan(0);
  for (const cagri of useInfiniteInsightsMock.mock.calls) {
    expect(JSON.stringify(cagri)).not.toContain('language');
  }
  expect(sonuc.fetchNextPage).not.toHaveBeenCalled();
});

/**
 * AYIRT EDICI: #199 oncesi uretilmis kayitlarda yalnizca Turkce ceviri var. Kullanici Ingilizce
 * secmis olsa da eldeki metin gosterilir -- bos bir kart gostermek yorumu kaybetmek olurdu.
 */
test('secili dilin cevirisi yoksa eldeki ceviri gosterilir', async () => {
  mockYorumDili = 'en';
  useInfiniteInsightsMock.mockReturnValue(
    sonsuzSorguSonucu([
      sayfa([ornekYorum({ translations: [{ language: 'tr', content: 'Eski Türkçe yorum.' }] })]),
    ]),
  );

  await ekraniOlustur();

  expect(screen.getByText('Eski Türkçe yorum.')).toBeTruthy();
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
      sayfa([ornekYorum({ id: 1, translations: [{ language: 'tr', content: 'Sayfa1Yorum' }] })], { page: 1, totalPages: 2 }),
      sayfa([ornekYorum({ id: 2, translations: [{ language: 'tr', content: 'Sayfa2Yorum' }] })], { page: 2, totalPages: 2 }),
    ]),
  );
  await ekraniOlustur();

  // #149: yalnizca en yeni kart ACIK; ikinci sayfanin karti kapali oldugu icin govdesi degil
  // basligi aranir -- sinanan sey iki sayfanin birlikte LISTELENMESI.
  expect(await screen.findByText('Sayfa1Yorum')).toBeTruthy();
  expect(screen.getByTestId('yorum-basligi-2')).toBeTruthy();
});

test('listenin sonuna gelinince (onEndReached) hasNextPage true iken fetchNextPage cagrilir', async () => {
  const sonuc = sonsuzSorguSonucu([sayfa([ornekYorum()], { page: 1, totalPages: 2 })]);
  useInfiniteInsightsMock.mockReturnValue(sonuc);
  await ekraniOlustur();
  await screen.findByText(ornekYorum().translations[0].content);

  fireEvent(screen.getByTestId('yorum-liste'), 'endReached');

  expect(sonuc.fetchNextPage).toHaveBeenCalledTimes(1);
});

test('son sayfadaysa (hasNextPage false) onEndReached tetiklense de fetchNextPage cagrilmaz', async () => {
  const sonuc = sonsuzSorguSonucu([sayfa([ornekYorum()], { page: 1, totalPages: 1 })]);
  useInfiniteInsightsMock.mockReturnValue(sonuc);
  await ekraniOlustur();
  await screen.findByText(ornekYorum().translations[0].content);

  fireEvent(screen.getByTestId('yorum-liste'), 'endReached');

  expect(sonuc.fetchNextPage).not.toHaveBeenCalled();
});

// ---- Yapisal gosterim (#454) ----

const YAPISAL = JSON.stringify({
  ozet: 'Düzenli gidiyorsun.',
  basarilar: ['Bench Press rekoru'],
  uyarilar: ['Çekiş hacmi düşük'],
  tavsiyeler: ['Haftaya bir kürek günü ekle'],
});

function yapisalYorum() {
  return ornekYorum({ translations: [{ language: 'tr', content: YAPISAL }] });
}

test('yapisal yorumun ozeti ve maddeleri ayri ayri cizilir', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa([yapisalYorum()])]));

  await ekraniOlustur();

  expect(screen.getByText('Düzenli gidiyorsun.')).toBeTruthy();
  expect(screen.getByText('Bench Press rekoru')).toBeTruthy();
  expect(screen.getByText('Çekiş hacmi düşük')).toBeTruthy();
  expect(screen.getByText('Haftaya bir kürek günü ekle')).toBeTruthy();
});

/**
 * #543 (kullanici bildirdi): arayuz dili Ingilizce iken yorum dili Turkce secilmisse, "Going well" /
 * "Watch out" / "Suggestions" gibi bolum basliklari INGILIZCE kaliyordu -- govde metni (AI'nin
 * urettigi) dogru dildeydi ama basliklar `useTranslation()`un ARAYUZ diline bagliydi, YORUM diline
 * degil. Basliklar artik yorumDili'ne gore cizilir.
 */
describe('bolum basliklari arayuz dilinden bagimsiz yorum dilini izler (#543)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('tr');
  });

  test('arayuz Ingilizce, yorum Turkce seciliyken basliklar Turkce gorunur', async () => {
    await i18n.changeLanguage('en');
    mockYorumDili = 'tr';
    useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa([yapisalYorum()])]));

    await ekraniOlustur();

    expect(screen.getByText('İyi gidenler')).toBeTruthy();
    expect(screen.getByText('Dikkat')).toBeTruthy();
    expect(screen.getByText('Öneriler')).toBeTruthy();
    expect(screen.queryByText('Going well')).toBeNull();
  });

  test('arayuz Turkce, yorum Ingilizce seciliyken basliklar Ingilizce gorunur', async () => {
    await i18n.changeLanguage('tr');
    mockYorumDili = 'en';
    useInfiniteInsightsMock.mockReturnValue(
      sonsuzSorguSonucu([
        sayfa([
          ornekYorum({
            translations: [
              {
                language: 'en',
                content: JSON.stringify({
                  ozet: 'Going steady.',
                  basarilar: ['Bench Press PR'],
                  uyarilar: ['Pull volume is low'],
                  tavsiyeler: ['Add a row day next week'],
                }),
              },
            ],
          }),
        ]),
      ]),
    );

    await ekraniOlustur();

    expect(screen.getByText('Going well')).toBeTruthy();
    expect(screen.getByText('Watch out')).toBeTruthy();
    expect(screen.getByText('Suggestions')).toBeTruthy();
    expect(screen.queryByText('İyi gidenler')).toBeNull();
  });

  /** Okunamayan icerigin yerini tutan metin de yorum diline gore degismeli. */
  test('okunamadi mesaji da yorum dilini izler', async () => {
    await i18n.changeLanguage('en');
    mockYorumDili = 'tr';
    useInfiniteInsightsMock.mockReturnValue(
      sonsuzSorguSonucu([sayfa([ornekYorum({ translations: [{ language: 'tr', content: '{bozuk' }] })])]),
    );

    await ekraniOlustur();

    expect(screen.getByText('Bu yorum okunamadı. Yeni bir yorum istemeyi deneyebilirsin.')).toBeTruthy();
  });
});

/** Basliklar katalogdan gelir; ham JSON anahtarlari ("basarilar") ekranda gorunmez. */
test('ham json ekranda gorunmez', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa([yapisalYorum()])]));

  await ekraniOlustur();

  expect(screen.queryByText(YAPISAL)).toBeNull();
  expect(screen.queryByText(/basarilar/)).toBeNull();
});

/** KRITIK: #454 oncesi kayitlar markdown; yeniden uretilmeyecekler, oldugu gibi okunmali. */
test('eski markdown yorum duz metin olarak cizilir', async () => {
  useInfiniteInsightsMock.mockReturnValue(
    sonsuzSorguSonucu([
      sayfa([ornekYorum({ translations: [{ language: 'tr', content: '**Genel** gidişat iyi.' }] })]),
    ]),
  );

  await ekraniOlustur();

  expect(screen.getByText('**Genel** gidişat iyi.')).toBeTruthy();
});

/**
 * KRITIK (#463): kullaniciya PARANTEZ YIGINI gosterilmez. Bozuk JSON'da anlasilir bir mesaj
 * cikar; ham metin cozumleyicinin sonucunda durmaya devam eder.
 */
test('bozuk json ekrana dokulmez, anlasilir mesaj cikar', async () => {
  useInfiniteInsightsMock.mockReturnValue(
    sonsuzSorguSonucu([sayfa([ornekYorum({ translations: [{ language: 'tr', content: '{"ozet": "yarim' }] })])]),
  );

  await ekraniOlustur();

  expect(screen.queryByText('{"ozet": "yarim')).toBeNull();
  expect(screen.getByRole('alert')).toBeTruthy();
});

/** Kullanici istegi: aciklamanin altinda yorumun Ingilizcede daha iyi calistigi notu. */
test('aciklamanin altinda ingilizce notu vardir', async () => {
  await ekraniOlustur();

  expect(screen.getByTestId('yorumlar-ingilizce-notu')).toBeTruthy();
});

// ---- Akordiyon (#149) ----

/** Iki yorum: yeni (id 1) ve eski (id 2). Liste sunucudan yeniden eskiye gelir. */
function ikiYorum() {
  return [
    ornekYorum({ id: 1, createdAt: '2026-09-20T10:00:00Z', translations: [{ language: 'tr', content: 'Yeni yorum.' }] }),
    ornekYorum({ id: 2, createdAt: '2026-09-14T10:00:00Z', translations: [{ language: 'tr', content: 'Eski yorum.' }] }),
  ];
}

/** Kullanici karari: en yeni yorum ustte ve ACIK; digerleri kapali kutu. */
test('en yeni yorum acik, digerleri kapali gelir', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa(ikiYorum())]));

  await ekraniOlustur();

  expect(screen.getByText('Yeni yorum.')).toBeTruthy();
  expect(screen.queryByText('Eski yorum.')).toBeNull();
});

/** Kapali kutuda TARIH muhakkak yazar -- kullanici hangi analiz oldugunu ondan anlar. */
test('kapali kutuda tarih gorunur', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa(ikiYorum())]));

  await ekraniOlustur();

  expect(screen.getByTestId('yorum-basligi-2')).toHaveTextContent(/14\.09\.2026/);
});

/** Kapaliya basinca ACILIR ve onceki acik KAPANIR: ayni anda tek kutu acik. */
test('kapaliya basinca acilir, onceki acik kapanir', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa(ikiYorum())]));
  await ekraniOlustur();

  await act(async () => fireEvent.press(screen.getByTestId('yorum-basligi-2')));

  expect(screen.getByText('Eski yorum.')).toBeTruthy();
  expect(screen.queryByText('Yeni yorum.')).toBeNull();
});

/** Acik kutuya tekrar basmak onu kapatir; hepsi kapali da gecerli bir durumdur. */
test('acik kutuya basinca kapanir', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa(ikiYorum())]));
  await ekraniOlustur();

  await act(async () => fireEvent.press(screen.getByTestId('yorum-basligi-1')));

  expect(screen.queryByText('Yeni yorum.')).toBeNull();
});

/** Silme yalnizca ACIK kartta: kapali satiri iki eylemli yapmak "dokununca acilir"i bozar. */
test('silme dugmesi yalnizca acik kartta bulunur', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa(ikiYorum())]));

  await ekraniOlustur();

  expect(screen.getAllByLabelText('Yorumu sil')).toHaveLength(1);
});

/** Tek yorum varsa o da acik gelir. */
test('tek yorum acik gelir', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa([ornekYorum()])]));

  await ekraniOlustur();

  expect(screen.getByText('Bench Press hacminde son iki haftada artış var.')).toBeTruthy();
});

/** #491 Gorev 2 (gorsel tasarim spec'i Karar 9): yorum kartlari duz `bg-surface-*` degil cam kart (`CamKart`). */
test('kapali ve acik yorum kartlari cam yuzeydedir', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa(ikiYorum())]));

  await ekraniOlustur();

  for (const id of ['yorum-karti-1', 'yorum-karti-2']) {
    const sinif: string = screen.getByTestId(id).props.className;
    expect(sinif).toContain('rounded-3xl');
    expect(sinif).not.toMatch(/bg-surface/);
  }
});

/** Silme onayi ayni kart yuvasinda acilir; duz yuzeye ziplamamali. */
test('silme onayi da cam yuzeydedir', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa(ikiYorum())]));
  await ekraniOlustur();

  await act(async () => fireEvent.press(screen.getByLabelText('Yorumu sil')));

  const sinif: string = screen.getByTestId('yorum-silme-karti-1').props.className;
  expect(sinif).toContain('rounded-3xl');
  expect(sinif).not.toMatch(/bg-surface/);
});

/** #491: acik kartin cop kutusu duz `bg-surface-3` kare degil, cam ikon dugmesi (`CamIkonDugmesi`). */
test('yorumu sil dugmesi cam ikon dugmesidir', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa(ikiYorum())]));

  await ekraniOlustur();

  const sinif: string = screen.getByLabelText('Yorumu sil').props.className;
  expect(sinif).toContain('rounded-3xl');
  expect(sinif).not.toMatch(/bg-surface/);
});

/** #491: ustteki "Yorum iste" kutusu da bir AI karti -- duz `bg-surface-1` degil cam. */
test('yorum iste kutusu cam yuzeydedir', async () => {
  useInfiniteInsightsMock.mockReturnValue(sonsuzSorguSonucu([sayfa(ikiYorum())]));

  await ekraniOlustur();

  const sinif: string = screen.getByTestId('yorum-iste-karti').props.className;
  expect(sinif).toContain('rounded-3xl');
  expect(sinif).not.toMatch(/bg-surface/);
});

// ---- #648: ilk 5 antrenman kilidi ----

/** #648: 5'ten az antrenmanda "GRINDY'ye sor" kilitli, altinda sebep ve mevcut sayi yazar. */
test('5 antrenmandan azsa GRINDYye sor kilitli ve sebebi yazar', async () => {
  useAntrenmanSayisiMock.mockReturnValue({ data: 3 });

  await ekraniOlustur();

  expect(screen.getByRole('button', { name: "GRINDY'ye sor" }).props.accessibilityState?.disabled).toBe(true);
  expect(screen.getByTestId('yorum-iste-kilit-sebebi')).toHaveTextContent(/en az 5 antrenman.*3 antrenmanın var/);
});

/** #648: tam 5 antrenmanda kilit acilir ve sebep yazisi kalkar. */
test('5 antrenmanda GRINDYye sor acik ve sebep yazisi yok', async () => {
  useAntrenmanSayisiMock.mockReturnValue({ data: 5 });

  await ekraniOlustur();

  expect(screen.getByRole('button', { name: "GRINDY'ye sor" }).props.accessibilityState?.disabled).not.toBe(true);
  expect(screen.queryByTestId('yorum-iste-kilit-sebebi')).toBeNull();
});

/** #648: aciklama metninden "belirli aralik secmek mumkun degil" cumlesi kaldirildi. */
test('aciklama belirli aralik cumlesini icermez', async () => {
  await ekraniOlustur();

  expect(screen.queryByText(/Belirli bir aralık/)).toBeNull();
  expect(screen.getByText(/son 30 güne kadarki antrenman verine bakıp yorumlar/)).toBeTruthy();
});
