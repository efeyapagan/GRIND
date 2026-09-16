import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import type { components } from '../api/schema';
import Takvim from './Takvim';

type CalendarResponse = components['schemas']['CalendarResponse'];

const BUGUN = '2026-09-15';

/** Antrenmani ve hedefi olmayan kullanicinin takvim ozeti. */
const BOS_OZET: Omit<CalendarResponse, 'from' | 'to'> = {
  days: [],
  trainedDayCount: 0,
  currentWeekStreak: 0,
  longestWeekStreak: 0,
  thisWeekTrainedDays: 0,
  weeklyTargetDays: null,
  currentTargetStreak: null,
};

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
    days: [{ date: '2026-09-14', sessionCount: 2, setCount: 18, volume: 4200 }],
    trainedDayCount: 1,
    currentWeekStreak: 2,
    longestWeekStreak: 12,
    thisWeekTrainedDays: 1,
    weeklyTargetDays: 4,
    currentTargetStreak: 3,
  });
  // #90: gunun sablon adlari gecmis ucundan. Gecmis ucu seti olmayan oturumu da dondurur (Pull Day) --
  // takvim onu saymadigi icin ozette gorunmez. Sunucu yeniden eskiye siralar; ozet eskiden yeniye yazar.
  const gecmisAraliklari: string[] = [];
  server.use(
    http.get('/api/history', ({ request }) => {
      const url = new URL(request.url);
      gecmisAraliklari.push(`${url.searchParams.get('From')}..${url.searchParams.get('To')}`);
      const oturum = (sessionId: number, startedAt: string, templateName: string | null, setCount: number) => ({
        sessionId, startedAt, endedAt: null, templateName, notes: null, totalVolume: 0, setCount, sets: [],
      });
      return HttpResponse.json({
        items: [
          oturum(3, '2026-09-14T17:00:00Z', 'Pull Day', 0),
          oturum(2, '2026-09-14T15:00:00Z', null, 8),
          oturum(1, '2026-09-14T06:00:00Z', 'Push Day', 10),
        ],
        page: 1,
        pageSize: 20,
        totalCount: 3,
        totalPages: 1,
      });
    }),
  );
  takvimiOlustur();

  expect(screen.getByRole('heading', { name: 'Takvim' })).toBeInTheDocument();
  expect(screen.getByText('Eylül 2026')).toBeInTheDocument();

  const antrenmanliGun = await screen.findByRole('button', { name: '14 Eylül: 18 set' });
  expect(antrenmanliGun).toHaveTextContent(/^14$/);
  expect(screen.getByRole('button', { name: '13 Eylül: antrenman yok' })).toHaveTextContent(/^13$/);
  expect(araliklar).toEqual(['2026-09-01..2026-09-30']);

  // #96: seriler HAFTA; #97: hedef, bu haftanin ilerlemesi ve hedef serisi -- hepsi API degeri.
  expect(screen.getByText('2 hafta')).toBeInTheDocument();
  expect(screen.getByText('12 hafta')).toBeInTheDocument();
  expect(screen.getByText('1 gün')).toBeInTheDocument();
  expect(screen.getByText('1 / 4 gün')).toBeInTheDocument();
  expect(screen.getByText('3 hafta')).toBeInTheDocument();
  expect(screen.getByLabelText('Haftalık hedef')).toHaveValue('4');

  await userEvent.click(antrenmanliGun);
  expect(await screen.findByText('14 Eylül · Push Day, Şablonsuz · 18 set')).toBeInTheDocument();
  expect(gecmisAraliklari).toEqual(['2026-09-14..2026-09-14']);

  // Antrenmansiz gun: gecmis istegi GITMEZ.
  await userEvent.click(screen.getByRole('button', { name: '13 Eylül: antrenman yok' }));
  expect(screen.getByText('13 Eylül · antrenman yok')).toBeInTheDocument();
  expect(gecmisAraliklari).toHaveLength(1);
});

test('Onceki bir onceki ayi ister; Haftalik bugunun haftasina doner, sonraki bugunde kapalidir', async () => {
  const araliklar = takvimSunucusu(BOS_OZET);
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

test('aralikta antrenman yoksa bos durum metni gorunur; hedef yokken hedef satirlari gorunmez', async () => {
  takvimSunucusu({ ...BOS_OZET, longestWeekStreak: 3 });
  takvimiOlustur();

  expect(await screen.findByText('Bu ay antrenman yok.')).toBeInTheDocument();
  expect(screen.queryByText('Hedef serisi')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Haftalık hedef')).toHaveValue('');
});

test('haftalik hedef secilince PUT gider ve takvim yeniden istenir (#97)', async () => {
  const araliklar = takvimSunucusu(BOS_OZET);
  const govdeler: unknown[] = [];
  server.use(
    http.put('/api/settings/weekly-target', async ({ request }) => {
      govdeler.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
  );
  takvimiOlustur();
  await waitFor(() => expect(araliklar).toHaveLength(1));

  await userEvent.selectOptions(screen.getByLabelText('Haftalık hedef'), '4');

  await waitFor(() => expect(govdeler).toEqual([{ weeklyTargetDays: 4 }]));
  await waitFor(() => expect(araliklar).toHaveLength(2));
});
