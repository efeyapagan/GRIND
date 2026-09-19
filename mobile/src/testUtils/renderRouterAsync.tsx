import { render } from '@testing-library/react-native';
import { getMockContext, type MockContextConfig } from 'expo-router/testing-library';
// expo-router'in kendi `renderRouter`i RNTL 14'ten ONCEKI senkron `render()` icin yazilmis --
// `await`lemeden cagiriyor, RNTL 14'te `render()` artik Promise dondugu icin `screen` hic
// kaydolmuyor ("render function has not been called"). Bu, expo-router'in kendisinin AYNI
// dosyada kullandigi ic yolu (`../ExpoRoot`) dogrudan kullanip DOGRU sekilde `await`leyen
// kucuk bir yerine gecendir -- kalici bir cozum degil, expo-router RNTL 14'e uyum saglayana
// kadar gereken bir koprudur.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ExpoRoot } = require('expo-router/build/ExpoRoot');

export async function renderRouterAsync(
  context: MockContextConfig = './app',
  { initialUrl = '/', linking }: { initialUrl?: string; linking?: unknown } = {},
) {
  const mockContext = getMockContext(context);
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  return render(<ExpoRoot context={mockContext} location={initialUrl} linking={linking} />);
}
