import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import KisiMenusu from './KisiMenusu';

const mockIstek = jest.fn();
const mockSessiz = jest.fn();
const mockTakip = jest.fn();
const mockCikar = jest.fn();
const mockSifirla = jest.fn();
const mockHata = { sessiz: false };
jest.mock('@grind/shared/api/queries', () => ({
  useArkadaslikIstegi: () => ({ mutate: mockIstek, reset: mockSifirla, isPending: false, isError: false }),
  useSessizeAl: () => ({ mutate: mockSessiz, reset: mockSifirla, isPending: false, isError: mockHata.sessiz }),
  useTakipEt: () => ({ mutate: mockTakip, reset: mockSifirla, isPending: false, isError: false }),
  useTakipcidenCikar: () => ({ mutate: mockCikar, reset: mockSifirla, isPending: false, isError: false }),
}));
jest.mock('../baglanti/useCevrimiciEylem', () => ({ useCevrimiciEylem: () => (f: unknown) => f }));
jest.mock('./ProfilFotografi', () => () => null);

const profil = {
  username: 'ali', displayName: null, hasAvatar: false, avatarVersion: null, age: null,
  friendCount: 0, followerCount: 0, followingCount: 0, privacyLevel: 'Kisitli',
  relation: 'Following', friendRequest: 'None', canSendFriendRequest: true, notificationsMuted: false,
} as const;

beforeEach(() => {
  jest.clearAllMocks();
  mockHata.sessiz = false;
});
afterEach(() => jest.restoreAllMocks());

test('satirlar sirayla: arkadaslik, sessize al, takibi birak', async () => {
  await render(<KisiMenusu profil={profil} acik onKapat={jest.fn()} />);
  const etiketler = screen.getAllByRole('button').map((d) => d.props.accessibilityLabel).filter(Boolean);
  expect(etiketler.filter((e: string) => e !== 'Kapat')).toEqual(['Arkadaş ekle', 'Sessize al', 'Takibi bırak']);
});

test('sessize al dogrudan calisir ve menuyu kapatir', async () => {
  const kapat = jest.fn();
  await render(<KisiMenusu profil={profil} acik onKapat={kapat} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Sessize al' }));
  expect(mockSessiz).toHaveBeenCalledWith({ kullaniciAdi: 'ali', sessiz: true }, expect.anything());
  mockSessiz.mock.calls[0][1].onSuccess();
  expect(kapat).toHaveBeenCalled();
});

test('takibi birak onay ister', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_b, _m, dugmeler) => dugmeler?.[1]?.onPress?.());
  await render(<KisiMenusu profil={profil} acik onKapat={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Takibi bırak' }));
  expect(mockTakip).toHaveBeenCalledWith({ kullaniciAdi: 'ali', takipEt: false }, expect.anything());
});

test('gonderilmis istekte geri cek satiri onay ister ve istegi geri ceker', async () => {
  const uyari = jest.spyOn(Alert, 'alert').mockImplementation((_b, _m, dugmeler) => dugmeler?.[1]?.onPress?.());
  await render(<KisiMenusu profil={{ ...profil, friendRequest: 'Sent' }} acik onKapat={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'İsteği geri çek' }));
  expect(uyari).toHaveBeenCalled();
  expect(mockIstek).toHaveBeenCalledWith({ kullaniciAdi: 'ali', gonder: false }, expect.anything());
});

/** Kapanan menu eski hatayi tasimaz: dort mutasyon da sifirlanir, yeniden acilinca uyari gorunmez. */
test('menu kapanirken mutasyon hatalari sifirlanir', async () => {
  mockHata.sessiz = true;
  const kapat = jest.fn();
  await render(<KisiMenusu profil={profil} acik onKapat={kapat} />);
  expect(screen.getByRole('alert')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Kapat' }));

  expect(mockSifirla).toHaveBeenCalledTimes(4);
  expect(kapat).toHaveBeenCalled();
});

test('yeni eylem baslarken onceki hata sifirlanir', async () => {
  await render(<KisiMenusu profil={profil} acik onKapat={jest.fn()} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Sessize al' }));

  expect(mockSifirla).toHaveBeenCalledTimes(4);
});
