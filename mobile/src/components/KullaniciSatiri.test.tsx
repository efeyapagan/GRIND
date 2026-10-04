import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import KullaniciSatiri from './KullaniciSatiri';

const mockTakip = jest.fn();
const mockTakipci = jest.fn();
const mockDurum = { takipci: { isPending: false, isError: false } };
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@grind/shared/api/queries', () => ({
  useTakipEt: () => ({ mutate: mockTakip, isPending: false, isError: false }),
  useTakipcidenCikar: () => ({ mutate: mockTakipci, ...mockDurum.takipci }),
  useProfilFotografi: () => ({ data: undefined }),
}));
jest.mock('../baglanti/useCevrimiciEylem', () => ({ useCevrimiciEylem: () => (f: unknown) => f }));

beforeEach(() => {
  jest.clearAllMocks();
  mockDurum.takipci = { isPending: false, isError: false };
});
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

/** Liste eylemi calisirken dugme kilitlenir; hata olursa takip dugmesindeki gibi uyari cikar. */
test('liste eylemi beklerken kilitlenir, hata verirse uyari gosterir', async () => {
  mockDurum.takipci = { isPending: true, isError: false };
  const kisi = { username: 'ali', displayName: null, hasAvatar: false, avatarVersion: null, relation: 'Friends' } as const;
  const { rerender } = await render(<KullaniciSatiri kisi={kisi} eylem="takipcidenCikar" />);

  expect(screen.getByRole('button', { name: 'Takipçiden çıkar' })).toBeDisabled();

  mockDurum.takipci = { isPending: false, isError: true };
  await rerender(<KullaniciSatiri kisi={kisi} eylem="takipcidenCikar" />);

  expect(screen.getByRole('alert')).toBeTruthy();
});

/** Eylemsiz (baskasinin listesi) satirda iliski belirler: arkadas = gosterge, iliskisiz = takip dugmesi. */
test('eylemsiz satirda arkadasa gosterge, iliskisize takip dugmesi gelir', async () => {
  const kisi = { username: 'ali', displayName: null, hasAvatar: false, avatarVersion: null } as const;
  const { rerender } = await render(<KullaniciSatiri kisi={{ ...kisi, relation: 'Friends' }} />);

  expect(screen.getByText('Arkadaş')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();

  await rerender(<KullaniciSatiri kisi={{ ...kisi, relation: 'None' }} />);

  expect(screen.queryByText('Arkadaş')).toBeNull();
  expect(screen.getByRole('button', { name: 'Takip et' })).toBeTruthy();
});
