import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import HareketGecmisi from './HareketGecmisi';
import type { components } from '../api/schema';

type HistorySessionResponse = components['schemas']['HistorySessionResponse'];

function gecmisiOlustur(bugunkuOturumId: number | null = 9) {
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <HareketGecmisi exerciseId={1} exerciseName="Bench Press" bugunkuOturumId={bugunkuOturumId} />
    </QueryClientProvider>,
  );
}

function oturum(sessionId: number, startedAt: string, totalVolume: number, setCount: number): HistorySessionResponse {
  return { sessionId, startedAt, endedAt: null, templateName: null, notes: null, totalVolume, setCount, sets: [] };
}

function sunucuyuKur(items: HistorySessionResponse[]) {
  const aramalar: URLSearchParams[] = [];
  server.use(
    http.get('/api/history', ({ request }) => {
      aramalar.push(new URL(request.url).searchParams);
      return HttpResponse.json({ items, page: 1, pageSize: 10, totalCount: items.length, totalPages: 1 });
    }),
  );
  return aramalar;
}

// Sunucu sirasi: yeniden eskiye. 9 = bugunku acik oturum.
const OTURUMLAR = [
  oturum(9, '2026-09-13T08:00:00Z', 800, 1),
  oturum(5, '2026-09-10T08:00:00Z', 2400, 3),
  oturum(3, '2026-09-08T08:00:00Z', 1200, 2),
];

test('ExerciseId ve PageSize=10 ile ister; cubuklar eskiden yeniye sunucunun hacimleriyle, bugun vurgulu', async () => {
  const aramalar = sunucuyuKur(OTURUMLAR);
  gecmisiOlustur();

  expect(await screen.findByRole('img', { name: 'Bench Press hacmi, son 3 antrenman' })).toBeInTheDocument();
  expect(aramalar[0].get('ExerciseId')).toBe('1');
  expect(aramalar[0].get('PageSize')).toBe('10');
  expect(screen.getAllByRole('listitem').map((madde) => madde.textContent)).toEqual([
    '8 Eyl: 1.200 kg',
    '10 Eyl: 2.400 kg',
    'Bugün: 800 kg',
  ]);
});

test('Gecen sefer satiri bugunden onceki en yeni oturumun sunucu degerlerini gosterir', async () => {
  sunucuyuKur(OTURUMLAR);
  gecmisiOlustur();

  expect(await screen.findByText('Geçen sefer: 3 set · 2.400 kg')).toBeInTheDocument();
});

test('bugunden once hic oturum yoksa Bu hareketin ilk antrenmani der ve grafik cizilmez', async () => {
  sunucuyuKur([oturum(9, '2026-09-13T08:00:00Z', 800, 1)]);
  gecmisiOlustur();

  expect(await screen.findByText('Bu hareketin ilk antrenmanı')).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
