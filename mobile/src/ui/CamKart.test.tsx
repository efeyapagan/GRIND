import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import CamKart from './CamKart';

/**
 * #589 (Faz 0): kare kart disindaki bicimler (dugme, satir) da cam olabilsin diye kose disaridan
 * verilir. Dis kap ve sac teli kenar AYNI koseyi tasir -- yoksa kenar karttan tasar. Varsayilan
 * `rounded-3xl` ArkadasKarsilastirma.test'te sabit.
 */
test('verilen kose dis kaba ve kenar katmanina birlikte uygulanir', async () => {
  await render(
    <CamKart testID="kart" koseSinifi="rounded-xl">
      <Text>icerik</Text>
    </CamKart>,
  );

  const disSinif: string = screen.getByTestId('kart').props.className;
  expect(disSinif).toContain('rounded-xl');
  expect(disSinif).not.toContain('rounded-3xl');
  expect(screen.getByTestId('cam-kenar').props.className).toContain('rounded-xl');
});

/** #589: acik antrenman varken "Bos antrenman baslat" soluk ve basilamaz kalir -- cam dugmede de. */
test('disabled iken basilamaz ve devre disi olarak isaretlenir', async () => {
  const basildi = jest.fn();
  await render(
    <CamKart onPress={basildi} disabled accessibilityLabel="Başla">
      <Text>Başla</Text>
    </CamKart>,
  );

  const kart = screen.getByRole('button', { name: 'Başla' });
  await fireEvent.press(kart);

  expect(basildi).not.toHaveBeenCalled();
  expect(kart.props.accessibilityState).toMatchObject({ disabled: true });
  expect(kart.props.className).toContain('opacity-60');
});
