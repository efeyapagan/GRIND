import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useTemplates, useDeleteTemplate, useSablonlariSirala } from '@grind/shared/api/queries';
import SablonlaBasla from './SablonlaBasla';

jest.mock('@grind/shared/api/queries', () => ({
  useTemplates: jest.fn(),
  useDeleteTemplate: jest.fn(),
  useSablonlariSirala: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: jest.fn(),
  };
});

const useTemplatesMock = useTemplates as jest.Mock;
const useDeleteTemplateMock = useDeleteTemplate as jest.Mock;
const useSablonlariSiralaMock = useSablonlariSirala as jest.Mock;
const sil = jest.fn();
const sirala = jest.fn();

function hareket(exerciseName: string, category: string, plannedSets: number) {
  return { exerciseId: 0, exerciseName, category, isArchived: false, plannedSets, restSeconds: 90 };
}

const SABLONLAR = [
  {
    id: 7,
    name: 'Push Day',
    exercises: [
      hareket('Bench Press', 'Push', 4),
      hareket('Incline Press', 'Push', 3),
      hareket('Dips', 'Push', 3),
      hareket('Lateral Raise', 'Push', 2),
    ],
  },
  { id: 8, name: 'Pull Day', exercises: [hareket('Pull Up', 'Pull', 3)] },
];

let panSpy: jest.SpyInstance;

beforeEach(() => {
  sil.mockReset();
  sirala.mockReset();
  mockPush.mockReset();
  panSpy = jest.spyOn(Gesture, 'Pan');
  useTemplatesMock.mockReturnValue({ data: SABLONLAR, isLoading: false, isError: false });
  useDeleteTemplateMock.mockReturnValue({ mutate: sil, isPending: false });
  useSablonlariSiralaMock.mockReturnValue({ mutate: sirala, isPending: false });
});

afterEach(() => {
  panSpy.mockRestore();
});

/** Son cizimde `indeks`teki kartin basili tutma jesti (her cizim her kart icin yeni jest kurar). */
function kartJesti(indeks: number) {
  const hepsi = panSpy.mock.results.map((sonuc) => sonuc.value);
  return hepsi.slice(-SABLONLAR.length)[indeks].handlers;
}

/** Parmak basili tutuldu, kaydirilmadan kaldirildi: menu acilir ve acik kalir. */
async function menuyuAc(indeks: number) {
  const jest_ = kartJesti(indeks);
  await act(async () => {
    jest_.onStart({ translationX: 0, absoluteX: 200 });
    jest_.onEnd({ translationX: 0, absoluteX: 200 });
  });
}

/** #439: kart ilk uc hareketin adini ve "N hareket | M set" ozetini gosterir. */
test('kart ilk uc hareketin adini, hareket ve toplam set sayisini gosterir', async () => {
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  expect(screen.getByText('Bench Press, Incline Press, Dips')).toBeTruthy();
  expect(screen.getByText('4 hareket')).toBeTruthy();
  expect(screen.getByText('12 set')).toBeTruthy();
});

/** Kartin "Basla" dugmesi O sablonla antrenmani baslatir. */
test('Basla dugmesi o sablonla antrenmani baslatir', async () => {
  const onBasla = jest.fn();
  await render(<SablonlaBasla onBasla={onBasla} bekliyor={false} />);

  await fireEvent.press(screen.getAllByRole('button', { name: 'Başla' })[1]);

  expect(onBasla).toHaveBeenCalledWith(8);
});

/** #439: yana kaydirma liste gezintisine gittigi icin kisayollar basili tutunca acilan menude. */
test('basili tutunca acilan menudeki Duzenle sablon formuna gider, antrenmani baslatmaz', async () => {
  const onBasla = jest.fn();
  await render(<SablonlaBasla onBasla={onBasla} bekliyor={false} />);

  await menuyuAc(0);
  await fireEvent.press(screen.getByRole('button', { name: 'Şablonu düzenle' }));

  expect(mockPush).toHaveBeenCalledWith('/templates/7');
  expect(onBasla).not.toHaveBeenCalled();
});

/** Silme geri alinamaz: menudeki Sil once onay sorar, onayla O sablon silinir. */
test('menudeki Sil once onay sorar, onaylaninca o sablon silinir', async () => {
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  await menuyuAc(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Şablonu sil' }));

  expect(screen.getByText(/Silmek istediğine emin misin/)).toBeTruthy();
  expect(sil).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: 'Evet, sil' }));

  expect(sil).toHaveBeenCalledWith(8);
});

/**
 * #439: basili tutmaya devam edip yana surukleyince menu kapanir, kart yer degistirir ve yeni sira
 * SUNUCUYA yazilir ("Şablonları yönet"teki siralamayla ayni veri).
 */
test('basili tutup yana surukleyince menu kapanir ve yeni sira sunucuya gonderilir', async () => {
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  const ilkKart = kartJesti(0);
  await act(async () => {
    ilkKart.onStart({ translationX: 0, absoluteX: 200 });
  });
  expect(screen.getByTestId('sablon-menusu')).toBeTruthy();

  await act(async () => {
    ilkKart.onUpdate({ translationX: 400, absoluteX: 600 });
  });
  expect(screen.queryByTestId('sablon-menusu')).toBeNull();

  await act(async () => {
    ilkKart.onEnd({ translationX: 400, absoluteX: 600 });
  });

  expect(sirala).toHaveBeenCalledWith([8, 7]);
});

// ---- Baslik satiri (#466) ----

/** #466: baslik ve GRIND artik ust BARDA (KabukBaslik), icerikte degil. */
test('baslik ve GRIND icerikte degil, barda', async () => {
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  expect(screen.queryByText('GRIND')).toBeNull();
  expect(screen.queryByText('Antrenmana başla')).toBeNull();
});

/** "Tumunu gor" -> "Duzenle"; gittigi yer degismedi. */
test('Duzenle dugmesi sablonlar ekranina gider', async () => {
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  expect(screen.queryByText('Tümünü gör')).toBeNull();
  expect(screen.getByText('Düzenle')).toBeTruthy();
});

// ---- Kaydedilenler bolumu (#467) ----

test('kaydedilen sablonlar en son kullanilana gore siralanir, kendi sablonlarindan ayri gorunur', async () => {
  useTemplatesMock.mockReturnValue({
    data: [
      { id: 1, name: 'Kendi Sablonum', exercises: [], savedFromUsername: null, lastUsedAt: null },
      { id: 2, name: 'Eski Kayit', exercises: [], savedFromUsername: 'efe', lastUsedAt: '2026-09-01T00:00:00Z' },
      { id: 3, name: 'Yeni Kayit', exercises: [], savedFromUsername: 'efe', lastUsedAt: '2026-09-20T00:00:00Z' },
    ],
    isLoading: false,
    isError: false,
  });

  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  expect(screen.getByText('Kaydedilenler')).toBeTruthy();
  const satirlar = screen.getAllByText(/Kayit$/);
  expect(satirlar.map((s) => s.props.children)).toEqual(['Yeni Kayit', 'Eski Kayit']);
});

test('kaydedilen sablon yoksa Kaydedilenler basligi gorunmez', async () => {
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  expect(screen.queryByText('Kaydedilenler')).toBeNull();
});

/**
 * #467 final review: backend ReorderAsync kullanicinin TUM sablonlarinin (kendi + kaydedilen) id
 * kumesini birebir bekler. Karuseldeki surukleme yalnizca kendi sablonlarini gonderirse, kullanicinin
 * en az bir kaydedilen sablonu varken her reorder 400 dondururdu -- bu regresyonu yakalar.
 */
test('surukleyip siralayinca kaydedilen sablonlarin id leri de gonderilir', async () => {
  useTemplatesMock.mockReturnValue({
    data: [
      ...SABLONLAR,
      { id: 3, name: 'Kayitli Sablon', exercises: [], savedFromUsername: 'efe', lastUsedAt: '2026-09-20T00:00:00Z' },
    ],
    isLoading: false,
    isError: false,
  });

  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  const ilkKart = kartJesti(0);
  await act(async () => {
    ilkKart.onStart({ translationX: 0, absoluteX: 200 });
  });
  await act(async () => {
    ilkKart.onUpdate({ translationX: 400, absoluteX: 600 });
  });
  await act(async () => {
    ilkKart.onEnd({ translationX: 400, absoluteX: 600 });
  });

  // Kendi sablonlari yeni sirada (8, 7), ardindan kaydedilen sablonun id'si (3) -- TUM kume.
  expect(sirala).toHaveBeenCalledWith([8, 7, 3]);
});
