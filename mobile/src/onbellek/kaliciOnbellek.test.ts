import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { kaliciOnbellegiBaslat, kaliciOnbellegiSil, onbellekAnahtari } from './kaliciOnbellek';

// #174: sorgu onbellegi cihaza kalici yazilir ki internet yokken son senkronize hal gorunsun. Onbellek
// KULLANICIYA baglidir: paylasilan bir cihazda baska hesabin verisi gorunmesin, cikista diskten silinir.

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('onbellek anahtari kullaniciya ozeldir ve buyuk-kucuk harfe duyarsizdir', () => {
  expect(onbellekAnahtari('Ada')).toBe(onbellekAnahtari('ada'));
  expect(onbellekAnahtari('ada')).not.toBe(onbellekAnahtari('efe'));
});

test('sorgu verisi kullanicinin anahtarina yazilir ve yeni bir istemciye geri yuklenir', async () => {
  const istemci = new QueryClient();
  const ilk = kaliciOnbellegiBaslat(istemci, 'ada');
  await ilk.geriYuklendi;
  istemci.setQueryData(['templates'], [{ id: 1, name: 'Push Day' }]);
  await kaliciOnbellegiYazilsin();
  ilk.durdur();
  istemci.clear();

  expect(await AsyncStorage.getItem(onbellekAnahtari('ada'))).toContain('Push Day');

  const yeniIstemci = new QueryClient();
  const ikinci = kaliciOnbellegiBaslat(yeniIstemci, 'ada');
  await ikinci.geriYuklendi;
  expect(yeniIstemci.getQueryData(['templates'])).toEqual([{ id: 1, name: 'Push Day' }]);
  ikinci.durdur();
  yeniIstemci.clear();
});

test('baska kullanicinin onbellegi geri yuklenmez', async () => {
  const istemci = new QueryClient();
  const ada = kaliciOnbellegiBaslat(istemci, 'ada');
  await ada.geriYuklendi;
  istemci.setQueryData(['templates'], [{ id: 1 }]);
  await kaliciOnbellegiYazilsin();
  ada.durdur();
  istemci.clear();

  const efeninIstemcisi = new QueryClient();
  const efe = kaliciOnbellegiBaslat(efeninIstemcisi, 'efe');
  await efe.geriYuklendi;
  expect(efeninIstemcisi.getQueryData(['templates'])).toBeUndefined();
  efe.durdur();
  efeninIstemcisi.clear();
});

test('silme kullanicinin diskteki onbellegini kaldirir', async () => {
  await AsyncStorage.setItem(onbellekAnahtari('ada'), '{"x":1}');

  await kaliciOnbellegiSil('ada');

  expect(await AsyncStorage.getItem(onbellekAnahtari('ada'))).toBeNull();
});

/** Kalicilik yazmayi kisa bir gecikmeyle toplu yapar; gercek zamanla beklenir. */
function kaliciOnbellegiYazilsin() {
  return new Promise((coz) => setTimeout(coz, 1_200));
}
