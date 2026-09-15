import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import type { components } from '../api/schema';
import Takvim from './Takvim';

type CalendarResponse = components['schemas']['CalendarResponse'];

const BUGUN = '2026-09-15';

/** Istenen araliklari ("2026-09-01..2026-09-30") sirasiyla kaydeder, verilen yaniti doner. */
function takvimSunucusu(yanit: Omit<CalendarResponse, 'from' | 'to'>) {
  const araliklar: string[] = [];
  server.use(
    http.get('/api/stats/calendar', ({ request }) => {
      const url = new URL(request.url);
      const from = url.searchParams.get('From');
      const to = url.searchParams.get('To');
      araliklar.push(`${from}..${to}`);
      return HttpResponse.json({ ...yanit, from, to });
    }),
  );
  return araliklar;
}

function takvimiOlustur() {
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <Takvim bugun={BUGUN} />
    </QueryClientProvider>,
  );
}

test('aylik gorunum bu ayi ister; gun hucresi numarasini ve set sayisini, seriler API degerini gosterir', async () => {
  const araliklar = takvimSunucusu({
    days: [{ date: '2026-09-14', sessionCount: 1, setCount: 18, volume: 4200 }],
    trainedDayCount: 1,
    currentStreak: 2,
    longestStreak: 12,
  });
  takvimiOlustur();

  expect(screen.getByRole('heading', { name: 'Takvim' })).toBeInTheDocument();
  expect(screen.getByText('Eylül 2026')).toBeInTheDocument();

  const antrenmanliGun = await screen.findByRole('button', { name: '14 Eylül: 18 set' });
  expect(antrenmanliGun).toHaveTextContent(/^14$/);
  expect(screen.getByRole('button', { name: '13 Eylül: antrenman yok' })).toHaveTextContent(/^13$/);
  expect(araliklar).toEqual(['2026-09-01..2026-09-30']);

  expect(screen.getByText('2 gün')).toBeInTheDocument();
  expect(screen.getByText('12 gün')).toBeInTheDocument();
  expect(screen.getByText('1 gün')).toBeInTheDocument();

  await userEvent.click(antrenmanliGun);
  expect(screen.getByText('14 Eylül · 1 antrenman · 18 set')).toBeInTheDocument();
});

test('Onceki bir onceki ayi ister; Haftalik bugunun haftasina doner, sonraki bugunde kapalidir', async () => {
  const araliklar = takvimSunucusu({ days: [], trainedDayCount: 0, currentStreak: 0, longestStreak: 0 });
  takvimiOlustur();
  await waitFor(() => expect(araliklar).toEqual(['2026-09-01..2026-09-30']));
  expect(screen.getByRole('button', { name: 'Sonraki' })).toBeDisabled();

  await userEvent.click(screen.getByRole('button', { name: 'Önceki' }));
  await waitFor(() => expect(araliklar).toContain('2026-08-01..2026-08-31'));
  expect(screen.getByText('Ağustos 2026')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: 'Haftalık' }));
  await waitFor(() => expect(araliklar).toContain('2026-09-14..2026-09-20'));
  expect(screen.getByRole('button', { name: 'Sonraki' })).toBeDisabled();

  await userEvent.click(screen.getByRole('button', { name: 'Önceki' }));
  await waitFor(() => expect(araliklar).toContain('2026-09-07..2026-09-13'));
  expect(screen.getByRole('button', { name: 'Sonraki' })).toBeEnabled();
});

test('aralikta antrenman yoksa bos durum metni gorunur', async () => {
  takvimSunucusu({ days: [], trainedDayCount: 0, currentStreak: 0, longestStreak: 3 });
  takvimiOlustur();

  expect(await screen.findByText('Bu ay antrenman yok.')).toBeInTheDocument();
});
