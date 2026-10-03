import { render, screen, fireEvent } from '@testing-library/react-native';
import FotografKirpici from './FotografKirpici';

const GORSEL = { uri: 'file:///hazir.jpg', genislik: 2000, yukseklik: 1000 };

/**
 * #565 (kullanici karari): kullanici kirpma alanini KENDISI secer -- iOS'un yerlesik kirpma ekrani
 * (`allowsEditing`) eski seciciyi actirip buyuk/iCloud fotograflarda tutarsizlasiyordu. Kirpma
 * ekrani yakinlastirma/kaydirma hesabini `fotografKirpma`dan alir; burada yalnizca ekranin
 * sozlesmesi sabitlenir.
 */
test('Kullan baslangicta gorselin ortasindaki kareyi doner', async () => {
  const onKullan = jest.fn();
  await render(<FotografKirpici gorsel={GORSEL} onKullan={onKullan} onVazgec={jest.fn()} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Kullan' }));

  expect(onKullan).toHaveBeenCalledWith({ originX: 500, originY: 0, width: 1000, height: 1000 });
});

test('Vazgec kirpma donmez, yalnizca vazgecildigini bildirir', async () => {
  const onKullan = jest.fn();
  const onVazgec = jest.fn();
  await render(<FotografKirpici gorsel={GORSEL} onKullan={onKullan} onVazgec={onVazgec} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Vazgeç' }));

  expect(onVazgec).toHaveBeenCalledTimes(1);
  expect(onKullan).not.toHaveBeenCalled();
});

test('baslik ve ipucu gosterilir, kirpilacak gorsel cizilir', async () => {
  await render(<FotografKirpici gorsel={GORSEL} onKullan={jest.fn()} onVazgec={jest.fn()} />);

  expect(screen.getByText('Fotoğrafı kırp')).toBeTruthy();
  expect(screen.getByText('Yakınlaştırmak için iki parmakla sıkıştır, konumlamak için sürükle.')).toBeTruthy();
  expect(screen.getByTestId('kirpilacak-gorsel').props.source).toEqual({ uri: 'file:///hazir.jpg' });
});
