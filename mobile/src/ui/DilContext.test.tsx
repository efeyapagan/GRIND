import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';
import { i18n } from '@grind/shared/i18n';
import { DilProvider, useDilTercihi, baslangicDili, DIL_ANAHTARI } from './DilContext';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const getLocalesMock = getLocales as jest.Mock;
const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const setItemAsync = SecureStore.setItemAsync as jest.Mock;

function cihazDili(...etiketler: string[]) {
  getLocalesMock.mockReturnValue(etiketler.map((languageTag) => ({ languageTag })));
}

beforeEach(() => {
  getItemAsync.mockReset().mockResolvedValue(null);
  setItemAsync.mockReset().mockResolvedValue(undefined);
  cihazDili('tr-TR');
});

function Deneme() {
  const { dil, secildiMi, setDil } = useDilTercihi();
  return (
    <>
      <Text>{`dil=${dil} secildi=${secildiMi}`}</Text>
      <Pressable onPress={() => setDil('en')}>
        <Text>ingilizce-sec</Text>
      </Pressable>
    </>
  );
}

async function ciz() {
  return render(
    <DilProvider>
      <Deneme />
    </DilProvider>,
  );
}

/** Tercih yokken cihaz dili izlenir -- Turkce cihaz Turkce arayuz gorur. */
test('tercih yoksa cihaz dili kullanilir', async () => {
  await ciz();

  expect(screen.getByText('dil=tr secildi=false')).toBeTruthy();
});

test('desteklenmeyen cihaz dili Ingilizceye duser', async () => {
  cihazDili('de-DE', 'fr-FR');

  expect(baslangicDili()).toBe('en');
});

test('cihaz listesindeki ILK desteklenen dil kazanir', async () => {
  cihazDili('de-DE', 'en-GB', 'tr-TR');

  expect(baslangicDili()).toBe('en');
});

test('saklanan tercih acilista uygulanir ve cihaz dilini ezer', async () => {
  getItemAsync.mockResolvedValue('en');

  await ciz();

  await waitFor(() => expect(screen.getByText('dil=en secildi=true')).toBeTruthy());
  expect(i18n.language).toBe('en');
});

test('dil secilince i18next degisir ve tercih cihaza yazilir', async () => {
  await ciz();

  await act(async () => fireEvent.press(screen.getByText('ingilizce-sec')));

  expect(setItemAsync).toHaveBeenCalledWith(DIL_ANAHTARI, 'en');
  expect(i18n.language).toBe('en');
  expect(screen.getByText('dil=en secildi=true')).toBeTruthy();
});
