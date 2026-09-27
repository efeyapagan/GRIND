import { render, screen, fireEvent } from '@testing-library/react-native';
import KabukBaslik from './KabukBaslik';

const mockPush = jest.fn();
let mockPathname = '/';
jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('../components/YorumDiliSecici', () => {
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <Pressable accessibilityRole="button" accessibilityLabel="Yorum dili">
        <Text>🇹🇷</Text>
      </Pressable>
    ),
  };
});
jest.mock('@grind/shared/pageTitle', () => ({ useHeaderTitle: () => 'Başlık' }));
// Dinlenme gostergesi RestTimerProvider ister; bu testlerin konusu degil.
jest.mock('../components/DinlenmeKabugu', () => ({ DinlenmeGostergesi: () => null }));

let mockOkunmamis: number | undefined = 0;
jest.mock('@grind/shared/api/queries', () => ({
  useOkunmamisBildirimSayisi: () => ({ data: mockOkunmamis }),
}));

beforeEach(() => {
  mockPush.mockReset();
  mockOkunmamis = 0;
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

/** #325: okunmamis varsa zilin ustunde sayi rozeti; etiket sayiyi tasir. */
test('okunmamis bildirim varsa rozet sayiyi gosterir, etiket sayiyi tasir', async () => {
  mockPathname = '/';
  mockOkunmamis = 3;
  await render(<KabukBaslik />);

  // Rozet sayisi erisilebilirlik agacindan gizli -- sorgu gizlileri de kapsar (SekmeDugmesi deseni).
  const gizliDahil = { includeHiddenElements: true };
  expect(screen.getByText('3', gizliDahil)).toBeTruthy();
  expect(screen.getByLabelText('Bildirimler, 3 okunmamış')).toBeTruthy();
});

test("okunmamis 9'dan fazlaysa rozet 9+ yazar", async () => {
  mockPathname = '/';
  mockOkunmamis = 12;
  await render(<KabukBaslik />);

  expect(screen.getByText('9+', { includeHiddenElements: true })).toBeTruthy();
});

test('okunmamis yoksa ya da sayi gelmediyse rozet cizilmez', async () => {
  mockPathname = '/';
  mockOkunmamis = undefined;
  await render(<KabukBaslik />);

  expect(screen.queryByTestId('zil-rozeti')).toBeNull();
  expect(screen.getByLabelText('Bildirimler')).toBeTruthy();
});

/**
 * #199: GRINDY ekraninda sag ustteki "GRIND" yazisinin yerini yorum dilinin bayragi alir --
 * kullanici yorumun dilini oradan degistirir.
 */
test('GRINDY ekraninda GRIND yazisi yerine bayrak vardir', async () => {
  mockPathname = '/insights';
  await render(<KabukBaslik />);

  expect(screen.queryByText('GRIND')).toBeNull();
  expect(screen.getByLabelText('Yorum dili')).toBeTruthy();
});

/** AYIRT EDICI: bayrak yalnizca o ekranda; diger ekranlarda "GRIND" durur. */
test('diger ekranlarda bayrak yoktur', async () => {
  mockPathname = '/templates';
  await render(<KabukBaslik />);

  expect(screen.getByText('GRIND')).toBeTruthy();
  expect(screen.queryByLabelText('Yorum dili')).toBeNull();
});
