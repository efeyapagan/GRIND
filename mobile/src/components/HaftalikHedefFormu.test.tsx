import { render, screen, fireEvent } from '@testing-library/react-native';
import { useGuncelTakvimOzeti, useSetWeeklyTarget } from '@grind/shared/api/queries';
import HaftalikHedefFormu from './HaftalikHedefFormu';

jest.mock('@grind/shared/api/queries', () => ({
  useGuncelTakvimOzeti: jest.fn(),
  useSetWeeklyTarget: jest.fn(),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

const useGuncelTakvimOzetiMock = useGuncelTakvimOzeti as jest.Mock;
const useSetWeeklyTargetMock = useSetWeeklyTarget as jest.Mock;
const mutate = jest.fn();

beforeEach(() => {
  mockBack.mockReset();
  mutate.mockReset();
  useGuncelTakvimOzetiMock.mockReturnValue({ data: { weeklyTargetDays: 4 }, isError: false });
  useSetWeeklyTargetMock.mockReturnValue({ mutate, isPending: false, isError: false });
});

/** #324: mevcut hedef isaretli acilir; secim degismeden kaydetmek anlamsiz oldugu icin Kaydet pasif. */
test('mevcut hedef secili gelir ve secim degismeden Kaydet pasiftir', async () => {
  await render(<HaftalikHedefFormu />);

  expect(screen.getByRole('radio', { name: '4 gün', checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: '3 gün', checked: false })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Kaydet' }).props.accessibilityState).toMatchObject({ disabled: true });
});

test('baska bir gun secilip kaydedilince hedef guncellenir ve geri donulur', async () => {
  await render(<HaftalikHedefFormu />);

  await fireEvent.press(screen.getByRole('radio', { name: '3 gün' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

  expect(mutate).toHaveBeenCalledWith(3, expect.anything());
  mutate.mock.calls[0][1].onSuccess();
  expect(mockBack).toHaveBeenCalled();
});

/** Hesap ayarlarindaki modal kalkti -- hedefi kaldirmanin tek yolu bu ekrandaki "Hedef yok". */
test('"Hedef yok" secilip kaydedilince hedef kaldirilir', async () => {
  await render(<HaftalikHedefFormu />);

  await fireEvent.press(screen.getByRole('radio', { name: 'Hedef yok' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

  expect(mutate).toHaveBeenCalledWith(null, expect.anything());
});
