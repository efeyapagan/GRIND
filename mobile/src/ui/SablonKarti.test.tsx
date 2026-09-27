import { render, screen, fireEvent } from '@testing-library/react-native';
import SablonKarti from './SablonKarti';

/**
 * #466: satir artik siralanabildigini GOSTERIR (solda tutamak) ve sagindaki ok yerine kalem
 * durur -- satira dokunmak sablonu duzenlemeye goturuyor, ok "ileri git" diyordu.
 */
test('solunda surukleme tutamagi vardir', async () => {
  await render(<SablonKarti ad="Push Day" hareketSayisi={3} onPress={jest.fn()} />);

  expect(screen.getByTestId('sablon-tutamak')).toBeTruthy();
});

test('saginda kalem ikonu vardir, ok yoktur', async () => {
  await render(<SablonKarti ad="Push Day" hareketSayisi={3} onPress={jest.fn()} />);

  expect(screen.getByTestId('sablon-duzenle-ikonu')).toBeTruthy();
  expect(screen.queryByTestId('sablon-ok-ikonu')).toBeNull();
});

test('satira dokunmak onPress cagirir', async () => {
  const onPress = jest.fn();
  await render(<SablonKarti ad="Push Day" hareketSayisi={3} onPress={onPress} />);

  await fireEvent.press(screen.getByText('Push Day'));

  expect(onPress).toHaveBeenCalled();
});

/** Devre disiyken dokunus gecmez: siralama/silme surerken yanlislikla acilmasin. */
test('devre disiyken onPress cagrilmaz', async () => {
  const onPress = jest.fn();
  await render(<SablonKarti ad="Push Day" hareketSayisi={3} onPress={onPress} disabled />);

  await fireEvent.press(screen.getByText('Push Day'));

  expect(onPress).not.toHaveBeenCalled();
});
