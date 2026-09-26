import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'nativewind';
import { TemaProvider, useTema, TEMA_ANAHTARI, type TemaTercihi } from './TemaContext';

jest.mock('nativewind', () => ({ useColorScheme: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const setColorScheme = jest.fn();
const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const setItemAsync = SecureStore.setItemAsync as jest.Mock;
const deleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  setColorScheme.mockReset();
  getItemAsync.mockReset().mockResolvedValue(null);
  setItemAsync.mockReset().mockResolvedValue(undefined);
  deleteItemAsync.mockReset().mockResolvedValue(undefined);
  (useColorScheme as unknown as jest.Mock).mockReturnValue({ colorScheme: 'dark', setColorScheme });
});

function Deneme() {
  const { tercih, etkinTema, setTercih } = useTema();
  return (
    <>
      <Text>{`tercih=${tercih} etkin=${etkinTema}`}</Text>
      {(['sistem', 'acik', 'koyu'] as TemaTercihi[]).map((secenek) => (
        <Pressable key={secenek} onPress={() => setTercih(secenek)}>
          <Text>{`sec-${secenek}`}</Text>
        </Pressable>
      ))}
    </>
  );
}

async function ciz() {
  return render(
    <TemaProvider>
      <Deneme />
    </TemaProvider>,
  );
}

test('acik secilince NativeWind light moda gecer ve tercih cihaza yazilir', async () => {
  await ciz();

  await act(async () => fireEvent.press(screen.getByText('sec-acik')));

  expect(setColorScheme).toHaveBeenCalledWith('light');
  expect(setItemAsync).toHaveBeenCalledWith(TEMA_ANAHTARI, 'acik');
  expect(screen.getByText('tercih=acik etkin=koyu')).toBeTruthy();
});

/** "sistem" bir deger degil, tercihin yoklugudur: anahtar silinir. */
test('sistem secilince anahtar silinir ve isletim sistemi izlenir', async () => {
  await ciz();

  await act(async () => fireEvent.press(screen.getByText('sec-koyu')));
  await act(async () => fireEvent.press(screen.getByText('sec-sistem')));

  expect(setColorScheme).toHaveBeenLastCalledWith('system');
  expect(deleteItemAsync).toHaveBeenCalledWith(TEMA_ANAHTARI);
  expect(setItemAsync).not.toHaveBeenCalledWith(TEMA_ANAHTARI, 'sistem');
});

test('acilista saklanan tercih uygulanir', async () => {
  getItemAsync.mockResolvedValue('acik');

  await ciz();

  await waitFor(() => expect(setColorScheme).toHaveBeenCalledWith('light'));
  expect(screen.getByText('tercih=acik etkin=koyu')).toBeTruthy();
});

test('saklanan tercih yoksa sistem kalir', async () => {
  await ciz();

  await waitFor(() => expect(setColorScheme).toHaveBeenCalledWith('system'));
  expect(screen.getByText('tercih=sistem etkin=koyu')).toBeTruthy();
});

test('etkin tema NativeWindin colorScheme degerinden okunur', async () => {
  (useColorScheme as unknown as jest.Mock).mockReturnValue({ colorScheme: 'light', setColorScheme });

  await ciz();

  expect(screen.getByText('tercih=sistem etkin=acik')).toBeTruthy();
});
