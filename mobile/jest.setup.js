require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

require('@grind/shared/i18n').i18nBaslat('tr');
