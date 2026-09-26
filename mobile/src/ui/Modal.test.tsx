import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import Modal from './Modal';
import { i18n } from '@grind/shared/i18n';

test('acik false iken icerik render edilmez', async () => {
  await render(
    <Modal acik={false} onKapat={jest.fn()} baslik="Başlık">
      <Text>İçerik</Text>
    </Modal>,
  );

  expect(screen.queryByText('İçerik')).toBeNull();
  expect(screen.queryByText('Başlık')).toBeNull();
});

test('acik true iken icerik ve baslik gorunur', async () => {
  await render(
    <Modal acik onKapat={jest.fn()} baslik="Başlık">
      <Text>İçerik</Text>
    </Modal>,
  );

  expect(screen.getByText('İçerik')).toBeTruthy();
  expect(screen.getByText('Başlık')).toBeTruthy();
});

test('Kapat dugmesi onKapat i cagirir', async () => {
  const onKapat = jest.fn();
  await render(
    <Modal acik onKapat={onKapat} baslik="Başlık">
      <Text>İçerik</Text>
    </Modal>,
  );

  await fireEvent.press(screen.getByRole('button', { name: 'Kapat' }));

  expect(onKapat).toHaveBeenCalledTimes(1);
});

test('Kapat dugmesinin etiketi katalogdan gelir (#360)', async () => {
  await i18n.changeLanguage('en');
  try {
    await render(
      <Modal acik onKapat={jest.fn()} baslik="Title">
        <Text>Body</Text>
      </Modal>,
    );

    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  } finally {
    await i18n.changeLanguage('tr');
  }
});
