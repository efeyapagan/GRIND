import { render, screen } from '@testing-library/react-native';
import AlevCizimi, { alevOturumunuSifirla } from './AlevCizimi';

beforeEach(() => alevOturumunuSifirla());

/**
 * #547 (kullanici karari): alev animasyonu uygulama ilk acildiginda BIR KEZ oynar; sonra uygulama
 * kapatilip acilana kadar cizim sabit kalir. "Bir kez" uygulama SURECI basinadir -- ekrandan cikip
 * donmek (bilesenin yeniden takilmasi) animasyonu tekrarlatmaz.
 */
test('ilk takilista animasyon oynar, sonraki takilislarda cizim sabittir', async () => {
  const ilk = await render(<AlevCizimi testID="alev" />);
  expect(screen.getByTestId('alev-oynuyor')).toBeTruthy();
  ilk.unmount();

  await render(<AlevCizimi testID="alev" />);
  expect(screen.queryByTestId('alev-oynuyor')).toBeNull();
  expect(screen.getByTestId('alev-sabit')).toBeTruthy();
});
