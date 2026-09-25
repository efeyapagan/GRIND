import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import EkranKaydirici from './EkranKaydirici';
import { altMenuPayi } from './KabukTabBar';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 34 }) }));

/**
 * #338: alt menu icerigin USTUNDE yuzer; en alttaki dugme/satir onun arkasinda kalmasin diye
 * kaydirici icerigin sonuna menunun kapladigi alani (guvenli alan dahil) birakir.
 */
test('icerigin altina yuzen alt menunun payini birakir', async () => {
  await render(
    <EkranKaydirici testID="kaydirici">
      <Text>icerik</Text>
    </EkranKaydirici>,
  );

  const stil = StyleSheet.flatten(screen.getByTestId('kaydirici').props.contentContainerStyle);
  expect(stil.paddingBottom).toBe(altMenuPayi(34));
});
