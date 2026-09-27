import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { DILLER } from '@grind/shared/i18n/dil';
import YorumDiliSecici from './YorumDiliSecici';

const mockSec = jest.fn();
let mockYorumDili = 'tr';

jest.mock('../ui/YorumDiliContext', () => ({
  useYorumDili: () => ({ yorumDili: mockYorumDili, yorumDiliniSec: mockSec }),
}));

beforeEach(() => {
  mockSec.mockReset();
  mockYorumDili = 'tr';
});

test('secili dilin bayragi gorunur', async () => {
  await render(<YorumDiliSecici />);

  expect(screen.getByText('🇹🇷')).toBeTruthy();
});

test('dil degisince bayrak da degisir', async () => {
  mockYorumDili = 'en';

  await render(<YorumDiliSecici />);

  expect(screen.getByText('🇬🇧')).toBeTruthy();
});

/**
 * #199'un asil sarti: "uygulamaya yeni dil eklendikce AI da o dilde yorum vermeli". Liste elle
 * yazilmaz, `DILLER`'den turer -- bu test yeni bir dil eklenince kendiliginde buyur.
 */
test('pencere DILLER listesindeki her dili gosterir', async () => {
  await render(<YorumDiliSecici />);

  await act(async () => fireEvent.press(screen.getByLabelText('Yorum dili')));

  for (const dil of DILLER) {
    expect(screen.getByTestId(`yorum-dili-${dil}`)).toBeTruthy();
  }
});

test('secilen dil tercihe yazilir ve pencere kapanir', async () => {
  await render(<YorumDiliSecici />);

  await act(async () => fireEvent.press(screen.getByLabelText('Yorum dili')));
  await act(async () => fireEvent.press(screen.getByTestId('yorum-dili-en')));

  expect(mockSec).toHaveBeenCalledWith('en');
  expect(screen.queryByTestId('yorum-dili-en')).toBeNull();
});
