import { act, render, screen, fireEvent } from '@testing-library/react-native';
import AntrenmanHedefiSecici from './AntrenmanHedefiSecici';

const mockMutate = jest.fn();
let mockProfil: { trainingGoal: string | null } | undefined;
let mockHata = false;

jest.mock('@grind/shared/api/queries', () => ({
  useProfilim: () => ({ data: mockProfil, isError: false }),
  useSetTrainingGoal: () => ({ mutate: mockMutate, isPending: false, isError: mockHata }),
}));

beforeEach(() => {
  mockMutate.mockReset();
  mockProfil = { trainingGoal: null };
  mockHata = false;
});

/** Hedef seçilmemişken varsayılan bir hedef UYDURULMAZ: "Seçilmedi" gerçek bir durumdur. */
test('hedef secilmemisse Secilmedi gosterilir', async () => {
  await render(<AntrenmanHedefiSecici />);

  expect(screen.getByText('Seçilmedi')).toBeTruthy();
});

test('sunucudan gelen hedef kapali kutuda gorunur', async () => {
  mockProfil = { trainingGoal: 'Guc' };

  await render(<AntrenmanHedefiSecici />);

  expect(screen.getByText('Kuvvet')).toBeTruthy();
});

test('secilen hedef uca gonderilir', async () => {
  await render(<AntrenmanHedefiSecici />);

  await act(async () => fireEvent.press(screen.getByText('Seçilmedi')));
  await act(async () => fireEvent.press(screen.getByText('Kas hacmi')));

  expect(mockMutate).toHaveBeenCalledWith('Hipertrofi');
});

/** `null` gecerli bir degerdir: hedefi KALDIRIR, "hic dokunma" demek degildir. */
test('Secilmedi secmek hedefi kaldirir', async () => {
  mockProfil = { trainingGoal: 'Hipertrofi' };

  await render(<AntrenmanHedefiSecici />);
  await act(async () => fireEvent.press(screen.getByText('Kas hacmi')));
  await act(async () => fireEvent.press(screen.getByText('Seçilmedi')));

  expect(mockMutate).toHaveBeenCalledWith(null);
});

test('kaydedilemezse kullanici sessizce birakilmaz', async () => {
  mockHata = true;

  await render(<AntrenmanHedefiSecici />);

  expect(screen.getByRole('alert')).toBeTruthy();
});
