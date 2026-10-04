import { fireEvent, render, screen } from '@testing-library/react-native';
import TakipDugmesi from './TakipDugmesi';

jest.mock('@grind/shared/api/queries', () => ({
  useTakipEt: () => ({ mutate: jest.fn(), isPending: false, isError: false }),
}));

/** #591: "Takibi birak" (ikincil hal) opak `surface-3` kutu degil hafif dolgu; "Takip et" accent kalir. */
test('takibi birak hali opak kutu cizmez', async () => {
  await render(<TakipDugmesi kullaniciAdi="ali" iliski="Friends" />);

  expect(screen.getByRole('button', { name: 'Takibi bırak' }).props.className).not.toMatch(/bg-surface/);
  expect(screen.getByTestId('cam-dolgu')).toBeTruthy();
});

test('menu verilince takip ederken Takiptesin cizer ve menuyu acar', async () => {
  const menu = jest.fn();
  await render(<TakipDugmesi kullaniciAdi="ali" iliski="Following" onMenu={menu} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Takiptesin' }));
  expect(menu).toHaveBeenCalled();
});
