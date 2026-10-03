import { render, screen } from '@testing-library/react-native';
import IkincilDugme from './IkincilDugme';

/**
 * #591: ikincil dugmenin kullanimlarinin neredeyse tamami cam kartin icinde ("Vazgec"ler). Opak
 * `surface-3` kutu yerine camin ustune serilen hafif dolgu (`CamDolgu`) -- #589'daki "liquid'in icinde
 * kutu kalmis" bulgusunun tum kullanimlar icin cozumu.
 */
test('opak kutu cizmez, zemini hafif dolgudur', async () => {
  await render(<IkincilDugme onPress={jest.fn()}>Vazgeç</IkincilDugme>);

  expect(screen.getByRole('button', { name: 'Vazgeç' }).props.className).not.toMatch(/bg-surface/);
  expect(screen.getByTestId('cam-dolgu')).toBeTruthy();
});
