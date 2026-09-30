import { render, screen } from '@testing-library/react-native';
import { acilisAnimasyonlariniSifirla } from './acilisAnimasyonu';
import DikeyCubuk from './DikeyCubuk';

beforeEach(() => acilisAnimasyonlariniSifirla());

/**
 * #547 (kullanici karari): ozet kartlarinin animasyonlari uygulama ilk acildiginda BIR KEZ oynar; sonra
 * uygulama kapatilip acilana kadar son halleri sabit durur. "Bir kez" uygulama SURECI basinadir --
 * ekrandan cikip donmek (bilesenin yeniden takilmasi) animasyonu tekrarlatmaz.
 *
 * Bu RNTL surumunde unmount da asenkron: beklenmezse sonraki render ile act() cakisir.
 */
test('ilk takilista alev tirmanir, sonraki takilislarda tepede sabittir', async () => {
  const ilk = await render(<DikeyCubuk testID="seri" oran={1} isaret="alev" />);
  expect(screen.getByTestId('alev-oynuyor')).toBeTruthy();
  await ilk.unmount();

  await render(<DikeyCubuk testID="seri" oran={1} isaret="alev" />);
  expect(screen.queryByTestId('alev-oynuyor')).toBeNull();
  expect(screen.getByTestId('alev-sabit')).toBeTruthy();
});

/**
 * Kullanici karari: alev tirmanirken cubugun dibinden kucuk kivilcimlar (kucuk alevler ve kivilcim
 * cizimleri) yukari firlayip soner. Yalnizca tirmanista -- sonraki takilislarda yok.
 */
test('tirmanirken dipten kivilcimlar firlar, sonraki takilislarda yoktur', async () => {
  const ilk = await render(<DikeyCubuk testID="seri" oran={1} isaret="alev" />);
  expect(screen.getByTestId('alev-kivilcimlari')).toBeTruthy();
  await ilk.unmount();

  await render(<DikeyCubuk testID="seri" oran={1} isaret="alev" />);
  expect(screen.queryByTestId('alev-kivilcimlari')).toBeNull();
});

/**
 * Kullanici karari: hedef tuttuysa cubugun dibinden 5 ok atilir ve tahtanin tam ortasina saplanir;
 * sonra tahtada tam ortadan vuran TEK bir ok kalir. Atis yalnizca surecin ilk takilisinda.
 */
test('ilk takilista 5 ok atilir, sonraki takilislarda tahtada tek ok sabittir', async () => {
  const ilk = await render(<DikeyCubuk testID="hedef" oran={1} isaret="dart" />);
  expect(screen.getAllByTestId('ucan-ok')).toHaveLength(5);
  await ilk.unmount();

  await render(<DikeyCubuk testID="hedef" oran={1} isaret="dart" />);
  expect(screen.queryAllByTestId('ucan-ok')).toHaveLength(0);
  expect(screen.getByTestId('saplanmis-ok')).toBeTruthy();
});

/** Alevin ve okun "bir kez" bayraklari AYRI: biri oynayinca digeri tukenmez. */
test('alev ve ok atisi birbirinin bayragini tuketmez', async () => {
  await render(
    <>
      <DikeyCubuk testID="seri" oran={1} isaret="alev" />
      <DikeyCubuk testID="hedef" oran={1} isaret="dart" />
    </>,
  );

  expect(screen.getByTestId('alev-oynuyor')).toBeTruthy();
  expect(screen.getAllByTestId('ucan-ok')).toHaveLength(5);
});
