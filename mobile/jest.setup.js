require('react-native-gesture-handler/jestSetup');

// Resmi mock `LayoutAnimationConfig`i bos birakir ("ADD ME IF NEEDED"); jest'te animasyon yok,
// cocuklari oldugu gibi cizmek yeterli (#332, Takvim). Mock modulun KENDISINE eklenir:
// expo-router/testing-library reanimated'i ayni modulden yeniden mock'lar, ayri bir fabrika onu ezerdi.
require('react-native-reanimated/mock').LayoutAnimationConfig = ({ children }) => children;
// #474: kutuphanenin mock'unda `useReducedMotion` yok; testlerde "hareketi azalt" kapali sayilir.
require('react-native-reanimated/mock').useReducedMotion = () => false;
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Ekranlar alt menunun payini guvenli alandan hesaplar (#338, `useAltMenuPayi`); tek ekran testlerinde
// `SafeAreaProvider` yok. Kutuphanenin kendi mock'u sifir inset verir; kendi mock'unu tanimlayan test
// dosyalari bunu ezer.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Cihaz dili testlerde SABIT: uygulama acilirken dili cihazdan aliyor (#263), mock olmazsa
// sonuclar makinenin yerel ayarina gore degisir ve Turkce metin arayan testler rastgele patlar.
// Dili kendisi degistiren testler bu mock'u ezer (bkz. src/ui/DilContext.test.tsx).
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'tr-TR' }] }));

// #433: yerel modulleri olan paylasim zinciri. Testte gercek modulleri yuklemek
// ("Super expression must either be null or a function") suite'i dusuruyor; davranislari
// paylasimGorseli.test.ts kendi mock'lariyla sinar.
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  Asset: { create: jest.fn() },
}));
jest.mock('expo-clipboard', () => ({ setImageAsync: jest.fn() }));

require('@grind/shared/i18n').i18nBaslat('tr');

// #174: kalici sorgu onbellegi AsyncStorage'a yazilir; yerel modul testte yok, paketin kendi mock'u
// bellekte calisir.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
