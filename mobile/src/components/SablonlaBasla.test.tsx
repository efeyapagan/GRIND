import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useTemplates, useSablonlariSirala, useDeleteTemplate } from '@grind/shared/api/queries';
import SablonlaBasla from './SablonlaBasla';

// Kisayollar ekran okuyucudan GIZLI (satirin kendi etiketi onlari anlatir): sorgu gizli ogeleri
// de kapsamazsa RNTL onlari hic gormez.
const GIZLI = { includeHiddenElements: true } as const;

jest.mock('@grind/shared/api/queries', () => ({
  useTemplates: jest.fn(),
  useSablonlariSirala: jest.fn(),
  useDeleteTemplate: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    useRouter: () => ({ push: mockPush }),
  };
});

const useTemplatesMock = useTemplates as jest.Mock;
const useSablonlariSiralaMock = useSablonlariSirala as jest.Mock;
const useDeleteTemplateMock = useDeleteTemplate as jest.Mock;
const mutate = jest.fn();
const sil = jest.fn();

const SABLONLAR = [
  { id: 7, name: 'Push Day', exercises: [{ exerciseId: 1 }] },
  { id: 8, name: 'Pull Day', exercises: [{ exerciseId: 1 }, { exerciseId: 2 }] },
  { id: 9, name: 'Leg Day', exercises: [] },
];

beforeEach(() => {
  mutate.mockReset();
  sil.mockReset();
  mockPush.mockReset();
  useTemplatesMock.mockReturnValue({ data: SABLONLAR, isLoading: false, isError: false });
  useSablonlariSiralaMock.mockReturnValue({ mutate, isPending: false });
  useDeleteTemplateMock.mockReturnValue({ mutate: sil, isPending: false });
});

function satirYuksekliginiBildir() {
  for (const satir of screen.getAllByTestId('surukle-satir')) {
    satir.props.onLayout({ nativeEvent: { layout: { height: 64 } } });
  }
}

/**
 * Her satir artik IKI Pan jesti kurar: disttaki siralama jesti (#344) ve icteki kaydirma jesti
 * (#435). Indekse gore secmek kirilgandi -- jestler kendi ayarlarindan ayirt edilir: siralama
 * basili tutmayla, kaydirma yatay esikle aktiflesir.
 */
function jestler(panSpy: jest.SpyInstance) {
  const hepsi = panSpy.mock.results.map((sonuc) => sonuc.value);
  return {
    siralama: hepsi.filter((jest_) => jest_.config.activateAfterLongPress !== undefined),
    kaydirma: hepsi.filter((jest_) => jest_.config.activeOffsetXStart !== undefined),
  };
}

/** #344: surukleyip birakinca yeni sira SUNUCUYA yazilir -- yoksa telefon degisince kaybolur. */
test('sablonu surukleyip birakinca yeni sira sunucuya gonderilir', async () => {
  const panSpy = jest.spyOn(Gesture, 'Pan');
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);
  satirYuksekliginiBildir();

  const ilkSatir = jestler(panSpy).siralama[0].handlers;
  await act(async () => {
    ilkSatir.onStart({ translationY: 0 });
    ilkSatir.onUpdate({ translationY: 140 });
    ilkSatir.onEnd({ translationY: 140 });
  });

  await waitFor(() => expect(mutate).toHaveBeenCalledWith([8, 9, 7]));
  panSpy.mockRestore();
});

/**
 * En olasi regresyon: surukleme jesti eklenince karta basmak antrenmani baslatmaz olur.
 * Basit dokunus eskisi gibi calismali.
 */
test('karta dokunmak antrenmani baslatmaya devam eder', async () => {
  const onBasla = jest.fn();
  await render(<SablonlaBasla onBasla={onBasla} bekliyor={false} />);

  await fireEvent.press(screen.getByText('Pull Day'));

  expect(onBasla).toHaveBeenCalledWith(8);
  expect(mutate).not.toHaveBeenCalled();
});

/** #435: silme geri alinamaz -- kisayola tek dokunus sablonu goturmez, kart yerinde onay sorar. */
test('Sil kisayolu once onay sorar, Vazgec ile silinmez', async () => {
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  await fireEvent.press(screen.getAllByTestId('kaydir-sil', GIZLI)[0]);

  expect(screen.getByText(/Silmek istediğine emin misin/)).toBeTruthy();
  expect(sil).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByText('Vazgeç'));

  expect(sil).not.toHaveBeenCalled();
  expect(screen.getByText('Push Day')).toBeTruthy();
});

/** #435: onay verilince O sablon silinir (listedeki dogru kayit). */
test('onay verilince kaydirilan sablon silinir', async () => {
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);

  await fireEvent.press(screen.getAllByTestId('kaydir-sil', GIZLI)[1]);
  await fireEvent.press(screen.getByText('Evet, sil'));

  expect(sil).toHaveBeenCalledWith(8);
});

/** #435: Duzenle kisayolu sablon duzenleme formuna gider, antrenmani BASLATMAZ. */
test('Duzenle kisayolu sablon formuna gider', async () => {
  const onBasla = jest.fn();
  await render(<SablonlaBasla onBasla={onBasla} bekliyor={false} />);

  await fireEvent.press(screen.getAllByTestId('kaydir-duzenle', GIZLI)[0]);

  expect(mockPush).toHaveBeenCalledWith('/templates/7');
  expect(onBasla).not.toHaveBeenCalled();
});

/**
 * #435: kisayollar acikken karta dokunmak antrenmani baslatmamali -- kullanici kartin kendisine
 * degil, acik kisayolu kapatmaya dokunuyor.
 */
test('kaydirma acikken karta dokunmak antrenmani baslatmaz', async () => {
  const panSpy = jest.spyOn(Gesture, 'Pan');
  const onBasla = jest.fn();
  await render(<SablonlaBasla onBasla={onBasla} bekliyor={false} />);

  const ilkKaydirma = jestler(panSpy).kaydirma[0].handlers;
  await act(async () => {
    ilkKaydirma.onStart({ translationX: 0 });
    ilkKaydirma.onUpdate({ translationX: -200 });
    ilkKaydirma.onEnd({ translationX: -200 });
  });

  await fireEvent.press(screen.getByText('Push Day'));

  expect(onBasla).not.toHaveBeenCalled();
  panSpy.mockRestore();
});
