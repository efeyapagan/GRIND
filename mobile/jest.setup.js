require('react-native-gesture-handler/jestSetup');

// Resmi mock `LayoutAnimationConfig`i bos birakir ("ADD ME IF NEEDED"); jest'te animasyon yok,
// cocuklari oldugu gibi cizmek yeterli (#332, Takvim). Mock modulun KENDISINE eklenir:
// expo-router/testing-library reanimated'i ayni modulden yeniden mock'lar, ayri bir fabrika onu ezerdi.
require('react-native-reanimated/mock').LayoutAnimationConfig = ({ children }) => children;
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

require('@grind/shared/i18n').i18nBaslat('tr');
