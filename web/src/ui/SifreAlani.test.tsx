import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SifreAlani from './SifreAlani';

function Sarmalayici() {
  const [deger, setDeger] = useState('gizli1234');
  return (
    <SifreAlani id="sifre" etiket="Şifre" value={deger} onChange={(e) => setDeger(e.target.value)} />
  );
}

test('goster dugmesi sifreyi gorunur yapar ve durumunu aria-pressed ile bildirir', async () => {
  const kullanici = userEvent.setup();
  render(<Sarmalayici />);

  const alan = screen.getByLabelText('Şifre');
  const dugme = screen.getByRole('button', { name: 'Şifreyi göster' });
  expect(alan).toHaveAttribute('type', 'password');
  expect(dugme).toHaveAttribute('aria-pressed', 'false');

  await kullanici.click(dugme);
  expect(alan).toHaveAttribute('type', 'text');
  expect(dugme).toHaveAttribute('aria-pressed', 'true');

  await kullanici.click(dugme);
  expect(alan).toHaveAttribute('type', 'password');
});
