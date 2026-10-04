import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import KullaniciSatiri from './KullaniciSatiri';

const mockTakip = jest.fn();
const mockTakipci = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@grind/shared/api/queries', () => ({
  useTakipEt: () => ({ mutate: mockTakip, isPending: false, isError: false }),
  useTakipcidenCikar: () => ({ mutate: mockTakipci, isPending: false, isError: false }),
  useProfilFotografi: () => ({ data: undefined }),
}));
jest.mock('../baglanti/useCevrimiciEylem', () => ({ useCevrimiciEylem: () => (f: unknown) => f }));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

/**
 * #592: arama ve takip listelerindeki satir duz `bg-surface-2` degil cam kart (spec Karar 9) --
 * arkadas karsilastirmasindaki `ArkadasSatiri` ile ayni dil ve kose.
 */
test('kullanici satiri cam yuzeydedir', async () => {
  await render(
    <KullaniciSatiri
      kisi={{ username: 'ali', displayName: null, hasAvatar: false, avatarVersion: null, relation: 'None' }}
    />,
  );

  const sinif: string = screen.getByTestId('kullanici-satiri-ali').props.className;
  expect(sinif).toContain('rounded-3xl');
  expect(sinif).not.toMatch(/bg-surface/);
});

/**
 * #628: kendi listemde satirin sagi listeye gore bir eylemdir, onay ister. "Arkadasliktan cikar" ve
 * "takipciden cikar" ayni mutasyondur (onun takibi kalkar, ben takipte kalirim).
 */
test.each([
  ['arkadasliktanCikar', 'Arkadaşlıktan çıkar', mockTakipci],
  ['takibiBirak', 'Takibi bırak', mockTakip],
  ['takipcidenCikar', 'Takipçiden çıkar', mockTakipci],
] as const)('kendi listemde %s onaydan sonra calisir', async (eylem, etiket, mutasyon) => {
  jest.spyOn(Alert, 'alert').mockImplementation((_b, _m, dugmeler) => dugmeler?.[1]?.onPress?.());
  await render(
    <KullaniciSatiri
      kisi={{ username: 'ali', displayName: null, hasAvatar: false, avatarVersion: null, relation: 'Friends' }}
      eylem={eylem}
    />,
  );

  await fireEvent.press(screen.getByRole('button', { name: etiket }));

  expect(mutasyon).toHaveBeenCalled();
  expect(screen.queryByText('Arkadaş')).toBeNull();
});
