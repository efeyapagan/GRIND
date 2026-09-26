import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { useTema } from '../ui/TemaContext';
import TemaSecici from './TemaSecici';

jest.mock('../ui/TemaContext', () => ({ useTema: jest.fn() }));

const setTercih = jest.fn();
const useTemaMock = useTema as jest.Mock;

beforeEach(() => {
  setTercih.mockReset();
  useTemaMock.mockReturnValue({ tercih: 'sistem', setTercih, etkinTema: 'koyu' });
});

/**
 * #271: hesap ayarlarindaki tema tusu. Ilk surumde dokunmak hicbir sey yapmiyordu; bu test
 * secimin gercekten iletildigini sabitler.
 */
test('secenege dokununca tercih degistirilir', async () => {
  await render(<TemaSecici />);

  await act(async () => fireEvent.press(screen.getByText('Sistem')));
  await act(async () => fireEvent.press(screen.getByText('Açık')));

  expect(setTercih).toHaveBeenCalledWith('acik');
});

test('secili tercih kutuda gorunur', async () => {
  useTemaMock.mockReturnValue({ tercih: 'koyu', setTercih, etkinTema: 'koyu' });

  await render(<TemaSecici />);

  expect(screen.getByText('Koyu')).toBeTruthy();
});
