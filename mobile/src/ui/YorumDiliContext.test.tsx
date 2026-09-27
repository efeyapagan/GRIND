import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { YorumDiliProvider, useYorumDili, YORUM_DILI_ANAHTARI } from './YorumDiliContext';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

let mockArayuzDili = 'en';
jest.mock('./DilContext', () => ({ useDilTercihi: () => ({ dil: mockArayuzDili }) }));

const getItem = SecureStore.getItemAsync as jest.Mock;
const setItem = SecureStore.setItemAsync as jest.Mock;

beforeEach(() => {
  getItem.mockReset().mockResolvedValue(null);
  setItem.mockReset().mockResolvedValue(undefined);
  mockArayuzDili = 'en';
});

function Deneme() {
  const { yorumDili, yorumDiliniSec, hazir } = useYorumDili();
  return (
    <>
      <Text>{`dil:${yorumDili}`}</Text>
      <Text>{`hazir:${hazir ? 'evet' : 'hayir'}`}</Text>
      <Pressable accessibilityRole="button" onPress={() => yorumDiliniSec('tr')}>
        <Text>tr yap</Text>
      </Pressable>
    </>
  );
}

async function kur() {
  return render(
    <YorumDiliProvider>
      <Deneme />
    </YorumDiliProvider>,
  );
}

/** Tercih yokken kullanıcıyı bir dil seçmeye zorlamayız: arayüz dili makul varsayılandır. */
test('tercih yoksa arayuz dili kullanilir', async () => {
  await kur();

  expect(await screen.findByText('dil:en')).toBeTruthy();
});

test('cihazda saklanan tercih arayuz dilini ezer', async () => {
  getItem.mockResolvedValue('tr');

  await kur();

  expect(await screen.findByText('dil:tr')).toBeTruthy();
});

test('secim hem gorunur hem cihaza yazilir', async () => {
  await kur();
  await screen.findByText('dil:en');

  await act(async () => fireEvent.press(screen.getByText('tr yap')));

  expect(screen.getByText('dil:tr')).toBeTruthy();
  expect(setItem).toHaveBeenCalledWith(YORUM_DILI_ANAHTARI, 'tr');
});

/** Bozuk/eski bir değer (ör. kaldırılmış bir dil) uygulamayı kilitlememeli. */
test('desteklenmeyen saklanan deger yok sayilir', async () => {
  getItem.mockResolvedValue('de');

  await kur();

  expect(await screen.findByText('dil:en')).toBeTruthy();
});

/** SecureStore okunamazsa (ör. kilitli cihaz) ekran yine de açılmalı. */
test('cihaz okunamazsa arayuz diline dusulur', async () => {
  getItem.mockRejectedValue(new Error('kilitli'));

  await kur();

  expect(await screen.findByText('dil:en')).toBeTruthy();
});

/**
 * #463: kart, birazdan degisecek bir dille cizilmemeli. Tercih SecureStore'dan asenkron geliyor;
 * cozulene kadar tuketiciler "hazir degil" demeli, yoksa ilk kare arayuz diliyle cizilip sonra
 * degisiyor -- kullanicinin "once JSON gordum, sonra duzeldi" dedigi titreme buydu.
 */
test('tercih cozulene kadar hazir degildir', async () => {
  let cozumle: (deger: string | null) => void = () => {};
  getItem.mockReturnValue(new Promise<string | null>((resolve) => { cozumle = resolve; }));

  await kur();
  expect(screen.getByText('hazir:hayir')).toBeTruthy();

  await act(async () => cozumle('tr'));

  expect(screen.getByText('hazir:evet')).toBeTruthy();
  expect(screen.getByText('dil:tr')).toBeTruthy();
});

test('cihaz okunamazsa da hazir olunur', async () => {
  getItem.mockRejectedValue(new Error('kilitli'));

  await kur();

  expect(await screen.findByText('hazir:evet')).toBeTruthy();
});
