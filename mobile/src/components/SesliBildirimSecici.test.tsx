import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { sesliBildirimiAyarla, useSesliBildirim } from '../bildirim/dinlenmeSesi';
import SesliBildirimSecici from './SesliBildirimSecici';

jest.mock('../bildirim/dinlenmeSesi', () => ({ sesliBildirimiAyarla: jest.fn(), useSesliBildirim: jest.fn() }));

const ayarla = sesliBildirimiAyarla as jest.Mock;

beforeEach(() => {
  ayarla.mockReset();
  (useSesliBildirim as jest.Mock).mockReturnValue(false);
});

async function ac() {
  await render(<SesliBildirimSecici />);
  await act(async () => fireEvent.press(screen.getByText('Kapalı')));
  await act(async () => fireEvent.press(screen.getByText('Açık')));
}

/** #414: hesap ayarlarindan acilir; ne ise yaradigi altinda yazar. */
test('Acik secilince tercih acilir', async () => {
  ayarla.mockResolvedValue(true);

  await ac();

  expect(ayarla).toHaveBeenCalledWith(true);
  expect(screen.getByText('Dinlenme süresi dolunca, uygulama arka plandayken de zil çalar.')).toBeTruthy();
});

/** Izin reddedilirse tercih acilamaz; kullaniciya nereden acacagi soylenir. */
test('izin verilmezse telefon ayarlarina yonlendiren aciklama cikar', async () => {
  ayarla.mockResolvedValue(false);

  await ac();

  expect(screen.getByRole('alert')).toHaveTextContent(/Bildirim izni verilmedi/);
});
