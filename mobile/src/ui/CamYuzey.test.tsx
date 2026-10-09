import { render, screen } from '@testing-library/react-native';
import CamKatmanlari from './CamKatmanlari';

// Testte `BlurView`in NativeWind kaydi atlanir: sinif stile cevrilmeden, verildigi gibi okunabilsin.
jest.mock('nativewind', () => ({ ...jest.requireActual('nativewind'), cssInterop: jest.fn() }));

/**
 * #668: ic ice camda (cam kartin icindeki cam kart) iOS, icteki bulanikligi kapsayicinin kirpmasiyla KIRPMIYOR;
 * satirin cevresinde kare koseli bir bant kaliyordu. Bulaniklik katmani kartin kosesini KENDISI tasimali.
 */
test('bulaniklik katmani kartin kose sinifiyla kendisi kirpilir', async () => {
  await render(<CamKatmanlari koseSinifi="rounded-xl" />);

  const bulaniklik = screen.getByTestId('cam-bulaniklik');

  expect(bulaniklik.props.className).toEqual(expect.stringContaining('overflow-hidden'));
  expect(bulaniklik.props.className).toEqual(expect.stringContaining('rounded-xl'));
});
