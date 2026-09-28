import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useOpenSession, useTemplates, useSablonlariSirala } from '@grind/shared/api/queries';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import SablonlarScreen from '../../../app/(tabs)/templates/index';

jest.mock('@grind/shared/api/queries', () => ({
  useTemplates: jest.fn(),
  useSablonlariSirala: jest.fn(),
  useOpenSession: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    useRouter: () => ({ push: jest.fn(), navigate: mockNavigate }),
  };
});

const ACIK_OTURUM = {
  id: 7,
  startedAt: '2026-09-20T09:00:00Z',
  isOpen: true,
  durationSeconds: null,
  templateId: 3,
  templateName: 'Push Day A',
  progress: [],
};

const mutate = jest.fn();

beforeEach(() => {
  mutate.mockReset();
  mockNavigate.mockReset();
  (useOpenSession as jest.Mock).mockReturnValue({ data: null });
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

/**
 * #480 (kullanici karari): antrenman surerken Sablonlarim'a gelen kullanici antrenmaninin
 * kaybolmadigini gormeli -- ust barin hemen altinda ana sayfadaki kartin AYNISI durur ve tek
 * dokunusla antrenmana doner.
 */
test('acik antrenman varken devam eden antrenman karti listenin ustunde durur', async () => {
  (useOpenSession as jest.Mock).mockReturnValue({ data: ACIK_OTURUM });

  await render(
    <PageTitleProvider>
      <SablonlarScreen />
    </PageTitleProvider>,
  );

  // #502: kartin isareti artik "Devam ediyor" rozeti degil -- sablon adi ve dugmenin kendisi.
  expect(screen.getByText('Push Day A')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Antrenmana devam et' }));
  expect(mockNavigate).toHaveBeenCalledWith('/antrenman');
});

/** AYIRT EDICI: antrenman yokken ekran bugunku haliyle kalir -- bos bir kutu belirmez. */
test('acik antrenman yokken kart cizilmez', async () => {
  await render(
    <PageTitleProvider>
      <SablonlarScreen />
    </PageTitleProvider>,
  );

  expect(screen.queryByText('Antrenmana devam et')).toBeNull();
});
