import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useTemplates, useSablonlariSirala } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import SablonlarScreen from '../../../app/(tabs)/templates/index';

jest.mock('@grind/shared/api/queries', () => ({
  useTemplates: jest.fn(),
  useSablonlariSirala: jest.fn(),
}));

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    useRouter: () => ({ push: jest.fn() }),
  };
});

const mutate = jest.fn();

beforeEach(() => {
  mutate.mockReset();
  (useTemplates as jest.Mock).mockReturnValue({
    data: [
      { id: 7, name: 'Push Day', exercises: [] },
      { id: 8, name: 'Pull Day', exercises: [] },
      { id: 9, name: 'Leg Day', exercises: [] },
    ],
    isLoading: false,
    isError: false,
  });
  (useSablonlariSirala as jest.Mock).mockReturnValue({ mutate, isPending: false });
});

/**
 * #439: antrenman ekranindaki kartlar yana kaydigi icin #344'un surukleyerek siralamasi buraya
 * tasindi. Sira yine SUNUCUYA yazilir -- yoksa telefon degisince kaybolur.
 */
test('sablonu surukleyip birakinca yeni sira sunucuya gonderilir', async () => {
  const panSpy = jest.spyOn(Gesture, 'Pan');
  await render(
    <PageTitleProvider>
      <SablonlarScreen />
    </PageTitleProvider>,
  );
  for (const satir of screen.getAllByTestId('surukle-satir')) {
    satir.props.onLayout({ nativeEvent: { layout: { height: 64 } } });
  }

  const ilkSatir = panSpy.mock.results[0].value.handlers;
  await act(async () => {
    ilkSatir.onStart({ translationY: 0 });
    ilkSatir.onUpdate({ translationY: 140 });
    ilkSatir.onEnd({ translationY: 140 });
  });

  await waitFor(() => expect(mutate).toHaveBeenCalledWith([8, 9, 7]));
  panSpy.mockRestore();
});
