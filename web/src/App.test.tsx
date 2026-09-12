import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from './App';

test('App, ic route icerigini Outlet ile gosterir', () => {
  render(
    <MemoryRouter initialEntries={['/ic-sayfa']}>
      <Routes>
        <Route path="/" element={<App />}>
          <Route path="ic-sayfa" element={<p>Ic sayfa icerigi</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  expect(screen.getByText('Ic sayfa icerigi')).toBeInTheDocument();
});
