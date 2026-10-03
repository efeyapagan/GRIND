import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import KaydirmaliKartlar from './KaydirmaliKartlar';

const SAYFA_GENISLIGI = 400;

function kur() {
  return render(
    <KaydirmaliKartlar>
      <Text>Haftalık hacim</Text>
      <Text>Tahmini 1RM</Text>
    </KaydirmaliKartlar>,
  );
}

/** Butun sayfalar ayni anda cizilir (yana kaydirinca hazir olsunlar); gosterge ilk sayfadan baslar. */
test('iki sayfa da cizilir, gosterge ilk sayfada', async () => {
  await kur();

  expect(screen.getByText('Haftalık hacim')).toBeTruthy();
  expect(screen.getByText('Tahmini 1RM')).toBeTruthy();
  expect(screen.getByLabelText('Sayfa 1 / 2')).toBeTruthy();
});

/** Kaydirma sayfaya oturunca gosterge o sayfaya gecer; geri kaydirinca geri doner. */
test('kaydirma bitince gosterge oturulan sayfayi gosterir', async () => {
  await kur();
  const kaydirici = screen.getByTestId('kaydirmali-kartlar');
  await fireEvent(kaydirici, 'layout', { nativeEvent: { layout: { width: SAYFA_GENISLIGI, height: 300 } } });

  await fireEvent(kaydirici, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: SAYFA_GENISLIGI, y: 0 } } });
  expect(screen.getByLabelText('Sayfa 2 / 2')).toBeTruthy();

  await fireEvent(kaydirici, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 0, y: 0 } } });
  expect(screen.getByLabelText('Sayfa 1 / 2')).toBeTruthy();
});
