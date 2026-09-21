import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEMA_ANAHTARI, sistemDinleyicisiKur, temayiTazele } from '../lib/tema';
import { sistemTemasiniAyarla } from '../test/matchMedia';
import TemaDugmesi from './TemaDugmesi';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

test('dokununca tema doner, tercih saklanir ve dugme karsi temayi onerir', async () => {
  const kullanici = userEvent.setup();
  sistemTemasiniAyarla(true);
  // Uygulamada bunu main.tsx yapar: DOM once sistem tercihine hizalanir.
  temayiTazele();
  render(<TemaDugmesi />);

  await kullanici.click(screen.getByRole('button', { name: 'Koyu temaya geç' }));

  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem(TEMA_ANAHTARI)).toBe('koyu');
  expect(screen.getByRole('button', { name: 'Açık temaya geç' })).toBeInTheDocument();
});

test('hic dokunulmamisken sistem temasi degisince dugme de doner', async () => {
  // Dugme temayi kendi state'inde tutmaz, <html data-theme>'i okur (#194). Bu test o senkronu
  // sabitler: dugme bagimsiz bir kopya tutsaydi sistem degisince eski ikonda kalirdi.
  const temizle = sistemDinleyicisiKur();
  temayiTazele();
  render(<TemaDugmesi />);
  expect(screen.getByRole('button', { name: 'Açık temaya geç' })).toBeInTheDocument();

  sistemTemasiniAyarla(true);

  expect(await screen.findByRole('button', { name: 'Koyu temaya geç' })).toBeInTheDocument();
  temizle();
});
