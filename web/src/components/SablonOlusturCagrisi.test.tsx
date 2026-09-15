import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SablonOlusturCagrisi from './SablonOlusturCagrisi';

function AlinanRota() {
  const donus = (useLocation().state as { donus?: string } | null)?.donus;
  return <p>{`donus=${donus}`}</p>;
}

function olustur() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<SablonOlusturCagrisi />} />
        <Route path="/templates/new" element={<AlinanRota />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('dugme /templates/new\'e donus: / state\'iyle gider (issue #61 Karar 3)', async () => {
  const kullanici = userEvent.setup();
  olustur();

  await kullanici.click(screen.getByRole('button', { name: 'Şablon oluştur' }));

  expect(await screen.findByText('donus=/')).toBeInTheDocument();
});
