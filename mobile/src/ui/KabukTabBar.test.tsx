import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import KabukTabBar from './KabukTabBar';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn() }));

let mockPathname = '/';
jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ navigate: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));

/**
 * #338: alt menu uc esit, etiketli sekmedir (Ana sayfa · Antrenman · Profil); aktif olan yoldan
 * belirlenir ve arkasinda secim hapi tasir. Alt yollar ust sekmesini aktif tutar; sekmesi olmayan
 * bir yolda (Sablonlar) hicbiri secili degildir.
 */
test.each([
  ['/', 'Ana sayfa'],
  ['/antrenman', 'Antrenman'],
  ['/antrenman-bitir', 'Antrenman'],
  ['/profile/records', 'Profil'],
  ['/templates', null],
])('%s yolunda secili sekme: %s', async (yol, beklenen) => {
  mockPathname = yol;
  await render(<KabukTabBar />);

  for (const ad of ['Ana sayfa', 'Antrenman', 'Profil']) {
    expect(screen.getByText(ad)).toBeTruthy();
    expect(screen.getByRole('tab', { name: ad, selected: ad === beklenen })).toBeTruthy();
  }
});

/** #379: bir sekmeye parmak degdigi anda (cubugun buyudugu an, #373) hafif bir dokunsal "tik" hissedilir. */
test('sekmeye basmaya baslayinca bir kez dokunsal titresim verir', async () => {
  mockPathname = '/';
  await render(<KabukTabBar />);

  fireEvent(screen.getByRole('tab', { name: 'Profil' }), 'pressIn');

  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
});
