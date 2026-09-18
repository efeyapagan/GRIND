import { fireEvent, render, screen } from '@testing-library/react-native';
import BirincilDugme from './BirincilDugme';

test('metin dugmesi basilabilir', async () => {
  const basildi = jest.fn();
  await render(
    <BirincilDugme yukseklik="normal" onPress={basildi}>
      Kaydet
    </BirincilDugme>,
  );

  await fireEvent.press(screen.getByText('Kaydet'));

  expect(basildi).toHaveBeenCalledTimes(1);
});

test('disabled iken basilamaz', async () => {
  const basildi = jest.fn();
  await render(
    <BirincilDugme yukseklik="normal" disabled onPress={basildi}>
      Kaydet
    </BirincilDugme>,
  );

  await fireEvent.press(screen.getByText('Kaydet'));

  expect(basildi).not.toHaveBeenCalled();
});
