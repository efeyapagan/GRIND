import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { ANAHTAR_ZINCIRI_KAYITLARI, ilkKurulumTemizligi, KURULUM_ISARETI } from './ilkKurulum';

// #663: iOS'ta anahtar zinciri uygulama silinince temizlenmez. Uygulamayi silip yeniden kuran kullanici onceki
// kurulumun temasini (sistem acikken koyu giris ekrani), dilini ve acik hesabini geri buluyordu.

jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));
// jest.setup.js bu modulu tum testlerde devre disi birakir; burada GERCEGI sinanir.
jest.unmock('./ilkKurulum');

async function anahtarZincirineYaz() {
  for (const anahtar of ANAHTAR_ZINCIRI_KAYITLARI) {
    await SecureStore.setItemAsync(anahtar, 'eski-kurulumdan');
  }
}

async function anahtarZinciri() {
  return Promise.all(ANAHTAR_ZINCIRI_KAYITLARI.map((anahtar) => SecureStore.getItemAsync(anahtar)));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await anahtarZincirineYaz();
});

/** Yeni kurulum (AsyncStorage bombos): tema, dil, oturum dahil her kayit silinir -- uygulama sifirdan baslar. */
test('yeni kurulumda onceki kurulumdan kalan anahtar zinciri kayitlari silinir', async () => {
  await ilkKurulumTemizligi();

  expect(await anahtarZinciri()).toEqual(ANAHTAR_ZINCIRI_KAYITLARI.map(() => null));
  expect(await AsyncStorage.getItem(KURULUM_ISARETI)).toBe('1');
});

/** Temizlik kurulum basina BIR KEZ: sonraki acilislarda kullanicinin tercihleri ve oturumu durur. */
test('sonraki acilislarda hicbir sey silinmez', async () => {
  await ilkKurulumTemizligi();
  await anahtarZincirineYaz();

  await ilkKurulumTemizligi();

  expect(await anahtarZinciri()).toEqual(ANAHTAR_ZINCIRI_KAYITLARI.map(() => 'eski-kurulumdan'));
});

/**
 * Bu surume GUNCELLENEN mevcut kurulumda isaret yoktur ama AsyncStorage doludur (sorgu onbellegi, kuyruk):
 * kullanicinin temasi ve oturumu silinmemeli.
 */
test('guncellenen mevcut kurulumda tercihlere ve oturuma dokunulmaz', async () => {
  await AsyncStorage.setItem('grind.sorgular.ada', '{}');

  await ilkKurulumTemizligi();

  expect(await anahtarZinciri()).toEqual(ANAHTAR_ZINCIRI_KAYITLARI.map(() => 'eski-kurulumdan'));
  expect(await AsyncStorage.getItem(KURULUM_ISARETI)).toBe('1');
});

/** Depo okunamazsa uygulama yine acilmali. */
test('depo hatasi disari sizmaz', async () => {
  const okuma = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('depo'));

  await expect(ilkKurulumTemizligi()).resolves.toBeUndefined();
  okuma.mockRestore();
});
