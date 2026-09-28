import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BASLATMA_GORUNUMU_YOLU } from '@grind/shared/lib/geriKaydirma';
import SablonOlusturCagrisi from './SablonOlusturCagrisi';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

beforeEach(() => mockPush.mockReset());

/**
 * #502 (kullanici bildirdi): sablon olusturup kaydedince ACIK antrenmanin ortasina dusuyordu.
 * Kaydetme sonrasi donus yolu form icin bir parametredir; burada baslatma gorunumu istenir.
 */
test('sablon olusturmaya giderken donus yolu baslatma gorunumudur', async () => {
  await render(<SablonOlusturCagrisi />);

  await act(async () => fireEvent.press(screen.getByRole('button')));

  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/templates/new',
    params: { donus: BASLATMA_GORUNUMU_YOLU },
  });
});
