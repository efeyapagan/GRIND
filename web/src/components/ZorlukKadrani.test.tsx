import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ZorlukKadrani from './ZorlukKadrani';

/**
 * #182 (#153'un web yarisi): antrenman zorlugu bes durakli surat kadraniyla secilir. Surukleme
 * burada test EDILMEZ -- jsdom'da SVG'nin ekran olcusu sifir, dokunusun acisi hesaplanamaz; aci →
 * durak hesabi `lib/zorlukKadrani.test.ts`te. Burada klavye (`role="slider"`) ve duraga tiklama.
 */
test('secili kademenin adi ve cumlesi yazar, kaydiricinin degeri onu tasir', () => {
  render(<ZorlukKadrani deger="Hard" onDegis={vi.fn()} />);

  expect(screen.getByText('Nefesimi zor tutuyordum')).toBeInTheDocument();
  const kaydirici = screen.getByRole('slider', { name: 'Antrenman zorluğu' });
  expect(kaydirici).toHaveAttribute('aria-valuenow', '4');
  expect(kaydirici).toHaveAttribute('aria-valuetext', 'Zor');
});

test('duraga tiklayinca o kademe secilir', async () => {
  const onDegis = vi.fn();
  render(<ZorlukKadrani deger="Medium" onDegis={onDegis} />);

  await userEvent.click(screen.getByRole('button', { name: 'Maksimal' }));

  expect(onDegis).toHaveBeenCalledWith('Maximal');
});

test('sag ok bir ust kademeye, sol ok bir alt kademeye gecer', async () => {
  const onDegis = vi.fn();
  render(<ZorlukKadrani deger="Medium" onDegis={onDegis} />);

  screen.getByRole('slider').focus();
  await userEvent.keyboard('{ArrowRight}');
  await userEvent.keyboard('{ArrowLeft}');

  expect(onDegis.mock.calls).toEqual([['Hard'], ['Easy']]);
});

test('Home en kolay, End en zor kademeye gider', async () => {
  const onDegis = vi.fn();
  render(<ZorlukKadrani deger="Medium" onDegis={onDegis} />);

  screen.getByRole('slider').focus();
  await userEvent.keyboard('{Home}');
  await userEvent.keyboard('{End}');

  expect(onDegis.mock.calls).toEqual([['VeryEasy'], ['Maximal']]);
});

test('en ust kademede sag ok kademeyi degistirmez', async () => {
  const onDegis = vi.fn();
  render(<ZorlukKadrani deger="Maximal" onDegis={onDegis} />);

  screen.getByRole('slider').focus();
  await userEvent.keyboard('{ArrowRight}');

  expect(onDegis).not.toHaveBeenCalled();
});
