import { render, screen, fireEvent } from '@testing-library/react-native';
import { useGuncelTakvimOzeti } from '@grind/shared/api/queries';
import HaftalikHedefSatiri from './HaftalikHedefSatiri';

jest.mock('@grind/shared/api/queries', () => ({
  useGuncelTakvimOzeti: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const useGuncelTakvimOzetiMock = useGuncelTakvimOzeti as jest.Mock;

beforeEach(() => {
  mockPush.mockReset();
});

test('hedef yokken "Hedef yok" gosterilir', async () => {
  useGuncelTakvimOzetiMock.mockReturnValue({ data: { weeklyTargetDays: null }, isError: false });
  await render(<HaftalikHedefSatiri />);

  expect(screen.getByText('Hedef yok')).toBeTruthy();
});

test('hedef varken gun sayisi gosterilir', async () => {
  useGuncelTakvimOzetiMock.mockReturnValue({ data: { weeklyTargetDays: 4 }, isError: false });
  await render(<HaftalikHedefSatiri />);

  expect(screen.getByText('Haftada 4 gün')).toBeTruthy();
});

/** #324: hedef artik modalda degil, ana sayfadaki kartla ayni hedef ekraninda secilir. */
test('satira dokununca haftalik hedef ekranina gidilir', async () => {
  useGuncelTakvimOzetiMock.mockReturnValue({ data: { weeklyTargetDays: 4 }, isError: false });
  await render(<HaftalikHedefSatiri />);

  await fireEvent.press(screen.getByText('Haftada 4 gün'));

  expect(mockPush).toHaveBeenCalledWith('/haftalik-hedef');
});
