import { DeviceEventEmitter, StyleSheet, Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
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

// ---- Odaklanan alani klavyenin ustunde tutma (#559) ----

/**
 * #559 (kullanici bildirdi): varsayilan davranis (hicbir `onKlavyeAcildi` verilmemisse) artik
 * `scrollToEnd` DEGIL `automaticallyAdjustKeyboardInsets` kullanir -- sablon formunda ORTADAKI bir
 * hareketin "hedef set" alanina dokununca, sona kaydirmak o alani gorunumden cikarabiliyordu;
 * native klavye-kaydirmasi ise kac tane input olursa olsun odaklanani otomatik ustte tutar.
 */
test('onKlavyeAcildi verilmemisse native klavye kaydirmasi acik olur', async () => {
  await render(
    <EkranKaydirici testID="kaydirici">
      <Text>icerik</Text>
    </EkranKaydirici>,
  );

  expect(screen.getByTestId('kaydirici').props.automaticallyAdjustKeyboardInsets).toBe(true);
});

/**
 * #559: `onKlavyeAcildi` veren TEK ekran (antrenman.tsx) yuzer bir set panelini bu ScrollView'in
 * DISINDA tutuyor ve klavye o panelden acilinca BU listenin kaymamasini istiyor. Native
 * klavye-kaydirmasi ScrollView'in CERCEVESIYLE klavyenin cakismasina bakar (odaklanan alan bu
 * ScrollView'in icinde mi diye ayirt etmez) -- acik kalsaydi o ekranda istenmeyen bir kaymaya
 * geri donulurdu, bu yuzden override edilince KAPANIR.
 */
test('onKlavyeAcildi verilmisse native klavye kaydirmasi kapanir, eski davranis gecerli olur', async () => {
  const onKlavyeAcildi = jest.fn();
  await render(
    <EkranKaydirici testID="kaydirici" onKlavyeAcildi={onKlavyeAcildi}>
      <Text>icerik</Text>
    </EkranKaydirici>,
  );

  expect(screen.getByTestId('kaydirici').props.automaticallyAdjustKeyboardInsets).toBe(false);

  await act(() => DeviceEventEmitter.emit('keyboardWillShow', { endCoordinates: { height: 300 } }));
  await waitFor(() => expect(onKlavyeAcildi).toHaveBeenCalledWith(300));

  const stil = StyleSheet.flatten(screen.getByTestId('kaydirici').props.contentContainerStyle);
  expect(stil.paddingBottom).toBe(300);
});
