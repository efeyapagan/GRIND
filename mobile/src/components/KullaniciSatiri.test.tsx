import { render, screen } from '@testing-library/react-native';
import KullaniciSatiri from './KullaniciSatiri';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@grind/shared/api/queries', () => ({
  useTakipEt: () => ({ mutate: jest.fn(), isPending: false, isError: false }),
  useProfilFotografi: () => ({ data: undefined }),
}));

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
