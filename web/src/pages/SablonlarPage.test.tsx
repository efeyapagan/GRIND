import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import SablonlarPage from './SablonlarPage';
import type { components } from '../api/schema';

type TemplateResponse = components['schemas']['TemplateResponse'];

function listeyiOlustur() {
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <MemoryRouter initialEntries={['/templates']}>
        <Routes>
          <Route path="/templates" element={<SablonlarPage />} />
          <Route path="/templates/new" element={<p>Yeni sablon formu</p>} />
          <Route path="/templates/:id" element={<p>Duzenleyici</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PUSH_DAY: TemplateResponse = {
  id: 7,
  name: 'Push Day',
  createdAt: '2026-09-01T08:00:00Z',
  exercises: [
    { id: 1, exerciseId: 1, exerciseName: 'Bench Press', category: 'Push', isArchived: false, orderIndex: 0, plannedSets: 4, restSeconds: 120 },
    { id: 2, exerciseId: 5, exerciseName: 'Overhead Press', category: 'Push', isArchived: false, orderIndex: 1, plannedSets: 3, restSeconds: 90 },
  ],
};

test('sablonlar hareket sayisiyla kart olarak listelenir ve karta dokunmak duzenleyiciyi acar', async () => {
  server.use(http.get('/api/templates', () => HttpResponse.json([PUSH_DAY])));
  const kullanici = userEvent.setup();
  listeyiOlustur();

  const kart = await screen.findByRole('link', { name: /Push Day/ });
  expect(kart).toHaveTextContent('2 hareket');

  await kullanici.click(kart);
  expect(await screen.findByText('Duzenleyici')).toBeInTheDocument();
});

test('sablon yokken bos durum gorunur ve Yeni sablon formu acar', async () => {
  server.use(http.get('/api/templates', () => HttpResponse.json([])));
  const kullanici = userEvent.setup();
  listeyiOlustur();

  expect(await screen.findByText('Henüz şablon yok')).toBeInTheDocument();
  await kullanici.click(screen.getByRole('button', { name: 'Yeni şablon' }));
  expect(await screen.findByText('Yeni sablon formu')).toBeInTheDocument();
});
