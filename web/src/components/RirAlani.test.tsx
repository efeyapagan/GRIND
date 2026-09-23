import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RirAlani from './RirAlani';

/**
 * #266: RIR artik yazilmaz, alana tiklayinca acilan on duraklik kaydiricidan secilir. Surukleme
 * burada test EDILMEZ -- jsdom'da rayin ekran olcusu sifir; konum → durak hesabi `lib/rir.test.ts`te.
 * Burada acilma, klavye (`role="slider"`), duraga tiklama, Temizle ve bilgi dugmesi.
 */
test('kapali baslar; alana tiklayinca kaydirici acilir ve secili durak aciklamasiyla yazar', async () => {
  const kullanici = userEvent.setup();
  render(<RirAlani id="rir" deger={2.5} onDegis={vi.fn()} />);

  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  await kullanici.click(screen.getByRole('button', { name: 'RIR (opsiyonel): 2–3' }));

  const kaydirici = screen.getByRole('slider', { name: 'RIR' });
  expect(kaydirici).toHaveAttribute('aria-valuenow', '2.5');
  expect(kaydirici).toHaveAttribute('aria-valuetext', '2–3 arası. Zorlayıcı ancak kontrollü ve güvenli.');
  expect(screen.getByText('Zorlayıcı ancak kontrollü ve güvenli.')).toBeInTheDocument();
});

/** Kullanici karari: tutamac hep gorunsun -- bos alan acilinca 0'dan baslar. */
test('deger yokken alan acilinca 0 secilir', async () => {
  const kullanici = userEvent.setup();
  const onDegis = vi.fn();
  render(<RirAlani id="rir" deger={null} onDegis={onDegis} />);

  await kullanici.click(screen.getByRole('button', { name: 'RIR (opsiyonel): girilmedi' }));

  expect(onDegis).toHaveBeenCalledWith(0);
});

test('duraga tiklayinca o deger secilir', async () => {
  const kullanici = userEvent.setup();
  const onDegis = vi.fn();
  render(<RirAlani id="rir" deger={2.5} onDegis={onDegis} />);

  await kullanici.click(screen.getByRole('button', { name: /^RIR/ }));
  await kullanici.click(screen.getByRole('button', { name: '4+' }));

  expect(onDegis).toHaveBeenCalledWith(5);
});

test('sag ok bir durak (yarim adim) ilerler, End 4+ duragina gider', async () => {
  const kullanici = userEvent.setup();
  const onDegis = vi.fn();
  render(<RirAlani id="rir" deger={2.5} onDegis={onDegis} />);

  await kullanici.click(screen.getByRole('button', { name: /^RIR/ }));
  screen.getByRole('slider').focus();
  await kullanici.keyboard('{ArrowRight}');
  await kullanici.keyboard('{End}');

  expect(onDegis.mock.calls).toEqual([[3], [5]]);
});

test('Temizle secili degeri kaldirir ve paneli kapatir', async () => {
  const kullanici = userEvent.setup();
  const onDegis = vi.fn();
  render(<RirAlani id="rir" deger={2} onDegis={onDegis} />);

  await kullanici.click(screen.getByRole('button', { name: /^RIR/ }));
  await kullanici.click(screen.getByRole('button', { name: 'Temizle' }));

  expect(onDegis).toHaveBeenCalledWith(null);
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
});

test('bilgi dugmesi RIRin ne oldugunu aciklar', async () => {
  const kullanici = userEvent.setup();
  render(<RirAlani id="rir" deger={null} onDegis={vi.fn()} />);

  await kullanici.click(screen.getByRole('button', { name: 'RIR (opsiyonel): girilmedi' }));
  await kullanici.click(screen.getByRole('button', { name: 'RIR nedir?' }));

  expect(screen.getByText(/setin sonunda yedekte kaç tekrar/)).toBeInTheDocument();
});
