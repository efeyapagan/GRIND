import { render, screen, fireEvent } from '@testing-library/react-native';
import KabukBaslik from './KabukBaslik';

const mockPush = jest.fn();
let mockPathname = '/';
jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('@grind/shared/pageTitle', () => ({ useHeaderTitle: () => 'Başlık' }));
// Dinlenme gostergesi RestTimerProvider ister; bu testlerin konusu degil.
jest.mock('../components/DinlenmeKabugu', () => ({ DinlenmeGostergesi: () => null }));

beforeEach(() => {
  mockPush.mockReset();
});

/** #324: ana sayfada sag ustte "GRIND" yazisinin yerini bildirim ve GRINDY kisayollari alir. */
test('ana sayfada bildirim ve GRINDY dugmeleri GRIND yazisinin yerini alir', async () => {
  mockPathname = '/';
  await render(<KabukBaslik />);

  expect(screen.queryByText('GRIND')).toBeNull();

  await fireEvent.press(screen.getByLabelText('Bildirimler'));
  expect(mockPush).toHaveBeenCalledWith('/bildirimler');

  await fireEvent.press(screen.getByLabelText("GRINDY'ye git"));
  expect(mockPush).toHaveBeenCalledWith('/insights');
});

test('ana sayfa disinda GRIND yazisi durur, kisayollar yoktur', async () => {
  mockPathname = '/templates';
  await render(<KabukBaslik />);

  expect(screen.getByText('GRIND')).toBeTruthy();
  expect(screen.queryByLabelText('Bildirimler')).toBeNull();
  expect(screen.queryByLabelText("GRINDY'ye git")).toBeNull();
});
