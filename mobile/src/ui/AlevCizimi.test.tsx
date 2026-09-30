import { render, screen } from '@testing-library/react-native';
import { alevOturumunuSifirla } from './AlevCizimi';
import DikeyCubuk from './DikeyCubuk';

beforeEach(() => alevOturumunuSifirla());

/**
 * #547 (kullanici karari): rekordaki serinin alevi uygulama ilk acildiginda BIR KEZ cubugun dibinden
 * tepeye tirmanir; sonra uygulama kapatilip acilana kadar tepede SABIT durur. "Bir kez" uygulama
 * SURECI basinadir -- ekrandan cikip donmek (bilesenin yeniden takilmasi) animasyonu tekrarlatmaz.
 */
test('ilk takilista alev tirmanir, sonraki takilislarda tepede sabittir', async () => {
  const ilk = await render(<DikeyCubuk testID="seri" oran={1} alev />);
  expect(screen.getByTestId('alev-oynuyor')).toBeTruthy();
  // Bu RNTL surumunde unmount da asenkron: beklenmezse sonraki render ile act() cakisir.
  await ilk.unmount();

  await render(<DikeyCubuk testID="seri" oran={1} alev />);
  expect(screen.queryByTestId('alev-oynuyor')).toBeNull();
  expect(screen.getByTestId('alev-sabit')).toBeTruthy();
});

/**
 * Kullanici karari: alev tirmanirken cubugun dibinden kucuk kivilcimlar (kucuk alevler ve kivilcim
 * cizimleri) yukari firlayip soner. Yalnizca tirmanista -- sonraki takilislarda yok.
 */
test('tirmanirken dipten kivilcimlar firlar, sonraki takilislarda yoktur', async () => {
  const ilk = await render(<DikeyCubuk testID="seri" oran={1} alev />);
  expect(screen.getByTestId('alev-kivilcimlari')).toBeTruthy();
  // Bu RNTL surumunde unmount da asenkron: beklenmezse sonraki render ile act() cakisir.
  await ilk.unmount();

  await render(<DikeyCubuk testID="seri" oran={1} alev />);
  expect(screen.queryByTestId('alev-kivilcimlari')).toBeNull();
});
