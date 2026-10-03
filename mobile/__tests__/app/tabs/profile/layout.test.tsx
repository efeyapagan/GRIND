import { render, screen } from '@testing-library/react-native';
import { useKullaniciProfili, useProfilim } from '@grind/shared/api/queries';
import { BaglantiBaglami } from '../../../../src/baglanti/BaglantiSaglayici';
import ProfileLayout from '../../../../app/(tabs)/profile/_layout';

jest.mock('@grind/shared/api/queries', () => ({
  useProfilim: jest.fn(),
  useKullaniciProfili: jest.fn(),
  useProfilFotografi: () => ({ data: null }),
}));
jest.mock('../../../../src/auth/AuthContext', () => ({ useAuth: () => ({ username: 'ada' }) }));
jest.mock('expo-router', () => ({
  Slot: () => null,
  usePathname: () => '/profile/history',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

beforeEach(() => {
  (useProfilim as jest.Mock).mockReturnValue({
    data: { username: 'ada', displayName: 'Ada', birthDate: null, age: null, hasAvatar: false, avatarVersion: null },
    isError: false,
  });
  (useKullaniciProfili as jest.Mock).mockReturnValue({
    data: { followerCount: 1, followingCount: 1, friendCount: 1 },
  });
});

test('cevrimiciyken profil duzenleme kalemi gorunur', async () => {
  await render(<ProfileLayout />);

  expect(screen.getByLabelText('Profili düzenle')).toBeTruthy();
});

/** #174 (kullanici karari): profil bilgileri onbellekten gorunur ama duzenleme kalemi gosterilmez. */
test('cevrimdisiyken profil bilgileri gorunur, duzenleme kalemi gosterilmez', async () => {
  await render(
    <BaglantiBaglami.Provider value>
      <ProfileLayout />
    </BaglantiBaglami.Provider>,
  );

  expect(screen.getByText('Ada')).toBeTruthy();
  expect(screen.queryByLabelText('Profili düzenle')).toBeNull();
});
