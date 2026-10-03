import { fireEvent, render, screen } from '@testing-library/react-native';
import PaylasilanSablonSatiri from './PaylasilanSablonSatiri';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

/**
 * #592: baskasinin Sablonlar sekmesindeki satir duz `bg-surface-2` + opak kenar degil cam kart (spec
 * Karar 9); dokununca yine salt-okunur detaya gider (#467).
 */
test('paylasilan sablon satiri cam yuzeydedir ve detaya gider', async () => {
  await render(
    <PaylasilanSablonSatiri
      kullaniciAdi="ali"
      sablon={{ id: 9, name: 'Push Day', exercises: [] }}
      ozet={{ kategori: 'Push', hareketAdlari: ['Bench Press'], toplamSet: 3 }}
    />,
  );

  const satir = screen.getByRole('button', { name: /Push Day/ });
  expect(satir.props.className).toContain('rounded-3xl');
  expect(satir.props.className).not.toMatch(/bg-surface|border-surface/);

  await fireEvent.press(satir);
  expect(mockPush).toHaveBeenCalledWith('/profile/u/ali/templates/9');
});
