import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ArkadaslikDugmesi from './ArkadaslikDugmesi';

const mockIstek = jest.fn();
const mockYanit = jest.fn();
const mockCikar = jest.fn();
jest.mock('@grind/shared/api/queries', () => ({
  useArkadaslikIstegi: () => ({ mutate: mockIstek, isPending: false, isError: false }),
  useArkadaslikYaniti: () => ({ mutate: mockYanit, isPending: false, isError: false }),
  useTakipcidenCikar: () => ({ mutate: mockCikar, isPending: false, isError: false }),
}));
jest.mock('../baglanti/useCevrimiciEylem', () => ({ useCevrimiciEylem: () => (f: unknown) => f }));

const temel = {
  username: 'ali', displayName: null, hasAvatar: false, avatarVersion: null, age: null,
  friendCount: 0, followerCount: 0, followingCount: 0, privacyLevel: 'Kisitli', notificationsMuted: false,
} as const;

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test('ekle halinde istek gonderir', async () => {
  await render(<ArkadaslikDugmesi profil={{ ...temel, relation: 'None', friendRequest: 'None', canSendFriendRequest: true }} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Arkadaş ekle' }));
  expect(mockIstek).toHaveBeenCalledWith({ kullaniciAdi: 'ali', gonder: true });
});

test('arkadas halinde onaydan sonra arkadasliktan cikarir', async () => {
  const uyari = jest.spyOn(Alert, 'alert').mockImplementation((_b, _m, dugmeler) => dugmeler?.[1]?.onPress?.());
  await render(<ArkadaslikDugmesi profil={{ ...temel, relation: 'Friends', friendRequest: 'None', canSendFriendRequest: true }} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Arkadaşsınız' }));
  expect(uyari).toHaveBeenCalled();
  expect(mockCikar).toHaveBeenCalledWith({ kullaniciAdi: 'ali' });
});

test('gelen istekte kabul secenegi kabul eder', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_b, _m, dugmeler) => dugmeler?.find((d) => d.text === 'Kabul et')?.onPress?.());
  await render(<ArkadaslikDugmesi profil={{ ...temel, relation: 'FollowedBy', friendRequest: 'Received', canSendFriendRequest: true }} />);
  await fireEvent.press(screen.getByRole('button', { name: 'İsteği yanıtla' }));
  expect(mockYanit).toHaveBeenCalledWith({ kullaniciAdi: 'ali', kabul: true });
});

test('sinir dolunca dugme pasif', async () => {
  await render(<ArkadaslikDugmesi profil={{ ...temel, relation: 'None', friendRequest: 'None', canSendFriendRequest: false }} />);
  expect(screen.getByRole('button', { name: 'İstek gönderilemez' })).toBeDisabled();
});
