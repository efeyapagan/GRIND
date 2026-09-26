import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useTemplates, useSablonlariSirala } from '@grind/shared/api/queries';
import SablonlaBasla from './SablonlaBasla';

jest.mock('@grind/shared/api/queries', () => ({
  useTemplates: jest.fn(),
  useSablonlariSirala: jest.fn(),
}));

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return { Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text> };
});

const useTemplatesMock = useTemplates as jest.Mock;
const useSablonlariSiralaMock = useSablonlariSirala as jest.Mock;
const mutate = jest.fn();

const SABLONLAR = [
  { id: 7, name: 'Push Day', exercises: [{ exerciseId: 1 }] },
  { id: 8, name: 'Pull Day', exercises: [{ exerciseId: 1 }, { exerciseId: 2 }] },
  { id: 9, name: 'Leg Day', exercises: [] },
];

beforeEach(() => {
  mutate.mockReset();
  useTemplatesMock.mockReturnValue({ data: SABLONLAR, isLoading: false, isError: false });
  useSablonlariSiralaMock.mockReturnValue({ mutate, isPending: false });
});

function satirYuksekliginiBildir() {
  for (const satir of screen.getAllByTestId('surukle-satir')) {
    satir.props.onLayout({ nativeEvent: { layout: { height: 64 } } });
  }
}

/** #344: surukleyip birakinca yeni sira SUNUCUYA yazilir -- yoksa telefon degisince kaybolur. */
test('sablonu surukleyip birakinca yeni sira sunucuya gonderilir', async () => {
  const panSpy = jest.spyOn(Gesture, 'Pan');
  await render(<SablonlaBasla onBasla={jest.fn()} bekliyor={false} />);
  satirYuksekliginiBildir();

  const ilkSatir = panSpy.mock.results[0].value.handlers;
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
