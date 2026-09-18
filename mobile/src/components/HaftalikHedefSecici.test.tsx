import { render, screen, fireEvent } from '@testing-library/react-native';
import { useGuncelTakvimOzeti, useSetWeeklyTarget } from '@grind/shared/api/queries';
import HaftalikHedefSecici from './HaftalikHedefSecici';

jest.mock('@grind/shared/api/queries', () => ({
  useGuncelTakvimOzeti: jest.fn(),
  useSetWeeklyTarget: jest.fn(),
}));

const useGuncelTakvimOzetiMock = useGuncelTakvimOzeti as jest.Mock;
const useSetWeeklyTargetMock = useSetWeeklyTarget as jest.Mock;

beforeEach(() => {
  useSetWeeklyTargetMock.mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false });
});

test('hedef yokken "Hedef yok" gosterilir', async () => {
  useGuncelTakvimOzetiMock.mockReturnValue({ data: { weeklyTargetDays: null }, isError: false });
  await render(<HaftalikHedefSecici />);

  expect(screen.getByText('Hedef yok')).toBeTruthy();
});

test('hedef varken gun sayisi gosterilir', async () => {
  useGuncelTakvimOzetiMock.mockReturnValue({ data: { weeklyTargetDays: 4 }, isError: false });
  await render(<HaftalikHedefSecici />);

  expect(screen.getByText('Haftada 4 gün')).toBeTruthy();
});

test('kutuya dokununca secenekler acilir ve secim mutate i cagirir', async () => {
  const mutate = jest.fn();
  useGuncelTakvimOzetiMock.mockReturnValue({ data: { weeklyTargetDays: null }, isError: false });
  useSetWeeklyTargetMock.mockReturnValue({ mutate, isPending: false, isError: false });
  await render(<HaftalikHedefSecici />);

  await fireEvent.press(screen.getByText('Hedef yok'));
  await fireEvent.press(screen.getByText('Haftada 3 gün'));

  expect(mutate).toHaveBeenCalledWith(3);
});
