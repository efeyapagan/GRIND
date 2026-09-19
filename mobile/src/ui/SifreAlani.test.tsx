import { render, screen, fireEvent } from '@testing-library/react-native';
import SifreAlani from './SifreAlani';

test('varsayilan olarak sifre gizlidir', async () => {
  await render(<SifreAlani id="sifre" etiket="Şifre" value="gizli-deger" onChangeText={jest.fn()} />);

  expect(screen.getByLabelText('Şifre').props.secureTextEntry).toBe(true);
});

test('goster dugmesine basinca sifre gorunur olur', async () => {
  await render(<SifreAlani id="sifre" etiket="Şifre" value="gizli-deger" onChangeText={jest.fn()} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Şifreyi göster' }));

  expect(screen.getByLabelText('Şifre').props.secureTextEntry).toBe(false);
});

test('tekrar basinca yeniden gizlenir', async () => {
  await render(<SifreAlani id="sifre" etiket="Şifre" value="gizli-deger" onChangeText={jest.fn()} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Şifreyi göster' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Şifreyi göster' }));

  expect(screen.getByLabelText('Şifre').props.secureTextEntry).toBe(true);
});
