import { render, screen } from '@testing-library/react-native';
import TakipListesi from './TakipListesi';

const mockSatirlar = [
  { username: 'ali', displayName: null, hasAvatar: false, avatarVersion: null, relation: 'Friends' },
  { username: 'veli', displayName: null, hasAvatar: false, avatarVersion: null, relation: 'FollowedBy' },
];
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ username: 'ada' }) }));
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ username: 'ada' }) }));
jest.mock('../ui/KabukTabBar', () => ({ useAltMenuPayi: () => 0 }));
jest.mock('@grind/shared/pageTitle', () => ({ usePageTitle: jest.fn() }));
jest.mock('@grind/shared/api/queries', () => ({
  useTakipListesi: () => ({
    data: { pages: [{ items: mockSatirlar }] },
    isLoading: false,
    isError: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));
// Satirin kendisi KullaniciSatiri.test'te sinanir; burada yalnizca ona hangi eylemin verildigine bakilir.
jest.mock('./KullaniciSatiri', () => ({
  __esModule: true,
  default: ({ kisi, eylem }: { kisi: { username: string }; eylem: string | null }) => {
    const { Text: Metin } = jest.requireActual('react-native');
    return <Metin testID={`eylem-${kisi.username}`}>{String(eylem)}</Metin>;
  },
}));

/**
 * #646: kendi takipci listemde ayni islem iliskiye gore adlanir -- arkadas olan satira
 * "arkadasliktanCikar", yalnizca takipci olana "takipcidenCikar"; eylem satir basina hesaplanir.
 */
test('takipciler listesinde eylem satirin iliskisine gore secilir', async () => {
  await render(<TakipListesi liste="followers" />);

  expect(screen.getByTestId('eylem-ali')).toHaveTextContent('arkadasliktanCikar');
  expect(screen.getByTestId('eylem-veli')).toHaveTextContent('takipcidenCikar');
});
