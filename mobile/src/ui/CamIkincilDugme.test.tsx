import { fireEvent, render, screen } from '@testing-library/react-native';
import CamIkincilDugme from './CamIkincilDugme';

/** #589: `IkincilDugme`nin cam hali -- duz yuzey degil cam kart; disabled iken basilmaz. */
test('cam yuzeydedir ve disabled iken basilamaz', async () => {
  const basildi = jest.fn();
  await render(
    <CamIkincilDugme onPress={basildi} disabled>
      Boş antrenman başlat
    </CamIkincilDugme>,
  );

  const dugme = screen.getByRole('button', { name: 'Boş antrenman başlat' });
  await fireEvent.press(dugme);

  expect(basildi).not.toHaveBeenCalled();
  expect(dugme.props.className).toContain('rounded-xl');
  expect(dugme.props.className).not.toMatch(/bg-surface/);
});
