import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEMA_ANAHTARI } from '../lib/tema';
import { sistemTemasiniAyarla } from '../test/matchMedia';
import GorunumSecici from './GorunumSecici';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

test('secim aninda uygulanir ve cihazda saklanir', async () => {
  const kullanici = userEvent.setup();
  render(<GorunumSecici />);

  const secim = screen.getByLabelText('Tema');
  expect(secim).toHaveValue('sistem');

  await kullanici.selectOptions(secim, 'acik');
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(localStorage.getItem(TEMA_ANAHTARI)).toBe('acik');

  await kullanici.selectOptions(secim, 'koyu');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem(TEMA_ANAHTARI)).toBe('koyu');
});

test('saklanan tercih secicide gorunur, "sistem" sistemi izler', async () => {
  const kullanici = userEvent.setup();
  localStorage.setItem(TEMA_ANAHTARI, 'koyu');
  sistemTemasiniAyarla(true);
  render(<GorunumSecici />);

  expect(screen.getByLabelText('Tema')).toHaveValue('koyu');

  await kullanici.selectOptions(screen.getByLabelText('Tema'), 'sistem');
  expect(document.documentElement.dataset.theme).toBe('light');
});
