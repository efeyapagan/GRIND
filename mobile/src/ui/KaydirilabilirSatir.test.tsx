import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import KaydirilabilirSatir from './KaydirilabilirSatir';

// #297: jest zinciri `Gesture.Pan()` ile baslamadigi icin Babel eklentisi callback'leri otomatik
// worklet yapmiyordu; gesture-handler da onlari JS thread'inde calistirip uyariyordu.
test('kaydirma jestinin callbackleri worklet (UI threadinde calisir)', async () => {
  const panSpy = jest.spyOn(Gesture, 'Pan');

  await render(
    <KaydirilabilirSatir onSil={jest.fn()} silEtiketi="sil">
      <Text>satir</Text>
    </KaydirilabilirSatir>,
  );

  const { handlers } = panSpy.mock.results[0].value;
  for (const ad of ['onStart', 'onUpdate', 'onEnd'] as const) {
    expect(handlers[ad]).toHaveProperty('__workletHash');
  }
  panSpy.mockRestore();
});
