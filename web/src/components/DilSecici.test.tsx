import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DilSecici from './DilSecici';
import { DIL_ANAHTARI } from '../lib/dil';

afterEach(() => localStorage.removeItem(DIL_ANAHTARI));

test('English secilince arayuz Ingilizceye doner', async () => {
  render(<DilSecici />);

  await userEvent.selectOptions(screen.getByLabelText('Dil'), 'en');

  expect(screen.getByLabelText('Language')).toHaveValue('en');
});
