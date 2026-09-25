import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import type { components } from '../api/schema';
import Takvim from './Takvim';

type CalendarResponse = components['schemas']['CalendarResponse'];

const BUGUN = '2026-09-15';
/** BUGUN'un haftasi (Pazartesi–Pazar) ve ayi -- testlerin bekledigi araliklar. */
const BU_HAFTA = '2026-09-14..2026-09-20';
const BU_AY = '2026-09-01..2026-09-30';

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

/** #261/#315: gune dokunmak gun detayina gider -- hedefi yazan sahte bir rota. */
function GunDetayRotasi() {
  return <p>{`gun detayi: ${useParams().gun}`}</p>;
}

function takvimiOlustur() {
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Takvim bugun={BUGUN} />} />
          <Route path="/gun/:gun" element={<GunDetayRotasi />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function izgara(): HTMLElement {
  return screen.getByTestId('takvim-izgara');
}

/** #315: donem degistirmenin yolu kaydirma. Sola kaydirma ileri, saga kaydirma geri gider. */
function kaydir(yon: 'sol' | 'sag') {
  const hedef = izgara();
  const bitis = yon === 'sol' ? 40 : 240;
  fireEvent.touchStart(hedef, { touches: [{ clientX: 140, clientY: 100 }] });
  fireEvent.touchMove(hedef, { touches: [{ clientX: bitis, clientY: 100 }] });
  fireEvent.touchEnd(hedef, { changedTouches: [{ clientX: bitis, clientY: 100 }] });
}

test('uygulama HAFTALIK acilir; gorunum sekmeleri ve ok dugmeleri yoktur', async () => {
  const araliklar = takvimSunucusu(BOS_OZET);
  takvimiOlustur();

  await waitFor(() => expect(araliklar).toEqual([BU_HAFTA]));
  // #315: "Aylık"/"Haftalık" sekmeleri ve "Önceki"/"Sonraki" oklari kaldirildi.
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Önceki' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sonraki' })).not.toBeInTheDocument();
});

test('takvim ikonu aylik ve haftalik arasinda gecis yapar', async () => {
  const araliklar = takvimSunucusu(BOS_OZET);
  takvimiOlustur();
  await waitFor(() => expect(araliklar).toEqual([BU_HAFTA]));

  await userEvent.click(screen.getByRole('button', { name: 'Aylık görünüme geç' }));

  await waitFor(() => expect(araliklar).toContain(BU_AY));
  expect(screen.getByText('Eylül 2026')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Haftalık görünüme geç' }));

  await waitFor(() => expect(araliklar.at(-1)).toBe(BU_HAFTA));
});

test('kaydirma donem degistirir: haftalikta hafta, aylikta ay', async () => {
  const araliklar = takvimSunucusu(BOS_OZET);
  takvimiOlustur();
  await waitFor(() => expect(araliklar).toEqual([BU_HAFTA]));

  kaydir('sag');
  await waitFor(() => expect(araliklar).toContain('2026-09-07..2026-09-13'));

  kaydir('sol');
  await waitFor(() => expect(araliklar.at(-1)).toBe(BU_HAFTA));

  await userEvent.click(screen.getByRole('button', { name: 'Aylık görünüme geç' }));
  await waitFor(() => expect(araliklar).toContain(BU_AY));

  kaydir('sag');
  await waitFor(() => expect(araliklar).toContain('2026-08-01..2026-08-31'));
  expect(screen.getByText('Ağustos 2026')).toBeInTheDocument();
});

test('bugunun doneminden ileri kaydirma yok sayilir', async () => {
  const araliklar = takvimSunucusu(BOS_OZET);
  takvimiOlustur();
  await waitFor(() => expect(araliklar).toEqual([BU_HAFTA]));

  kaydir('sol');

  // Gelecege gezinilmez (#81): istek gitmez, baslik degismez.
  await new Promise((coz) => setTimeout(coz, 20));
  expect(araliklar).toEqual([BU_HAFTA]);
});

test('izgara odaktayken ok tuslari da donem degistirir', async () => {
  const araliklar = takvimSunucusu(BOS_OZET);
  takvimiOlustur();
  await waitFor(() => expect(araliklar).toEqual([BU_HAFTA]));

  // Oklar kalkinca fare/klavye kullanicisinin tek erisim yolu bu (kaydirma dokunmatige ozgu).
  fireEvent.keyDown(izgara(), { key: 'ArrowLeft' });
  await waitFor(() => expect(araliklar).toContain('2026-09-07..2026-09-13'));

  fireEvent.keyDown(izgara(), { key: 'ArrowRight' });
  await waitFor(() => expect(araliklar.at(-1)).toBe(BU_HAFTA));
});

test('antrenman yapilan gun yesil, antrenmansiz gun degil', async () => {
  takvimSunucusu({
    ...BOS_OZET,
    days: [{ date: '2026-09-14', sessionCount: 1, setCount: 18, volume: 4200 }],
    trainedDayCount: 1,
  });
  takvimiOlustur();

  const antrenmanli = await screen.findByRole('button', { name: '14 Eylül: 18 set' });
  const bos = screen.getByRole('button', { name: '15 Eylül: antrenman yok' });

  expect(antrenmanli.className).toContain('success');
  expect(bos.className).not.toContain('success');
});

test('gun hucresi numarasini ve set sayisini gosterir; secilince gunun ozeti cikar', async () => {
  const araliklar = takvimSunucusu({
    days: [{ date: '2026-09-14', sessionCount: 2, setCount: 18, volume: 4200 }],
    trainedDayCount: 1,
    currentWeekStreak: 2,
    longestWeekStreak: 12,
    thisWeekTrainedDays: 1,
    weeklyTargetDays: 4,
    currentTargetStreak: 3,
  });
  // #90: gunun sablon adlari gecmis ucundan; seti olmayan oturum (Pull Day) ozette gorunmez.
  const gecmisAraliklari: string[] = [];
  server.use(
    http.get('/api/history', ({ request }) => {
      const url = new URL(request.url);
      gecmisAraliklari.push(`${url.searchParams.get('From')}..${url.searchParams.get('To')}`);
      const oturum = (sessionId: number, startedAt: string, templateName: string | null, setCount: number) => ({
        sessionId, startedAt, endedAt: null, templateName, notes: null, totalVolume: 0, setCount, sets: [],
      });
      // Sunucu yeniden eskiye siralar; ozet eskiden yeniye yazar. Seti olmayan (Pull Day) ozete girmez.
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

  await waitFor(() => expect(araliklar).toEqual([BU_HAFTA]));
  const antrenmanliGun = await screen.findByRole('button', { name: '14 Eylül: 18 set' });
  expect(antrenmanliGun).toHaveTextContent('14');
  // #315: ozet yalnizca iki seri -- "Antrenman gunu"/"Bu hafta" kaldirildi.
  expect(screen.getByText('Aktif seri')).toBeInTheDocument();
  expect(screen.getByText('Hedef serisi')).toBeInTheDocument();
  expect(screen.queryByText('Antrenman günü')).not.toBeInTheDocument();
  expect(screen.queryByText('Bu hafta')).not.toBeInTheDocument();

  await userEvent.click(antrenmanliGun);

  // #261/#315: ozet satiri kalkti; gun detayi ayri bir ekranda acilir.
  expect(await screen.findByText('gun detayi: 2026-09-14')).toBeInTheDocument();
  expect(gecmisAraliklari).toEqual([]);
});

test('antrenmansiz gune dokunmak da o gunun detayina gider', async () => {
  takvimSunucusu(BOS_OZET);
  const kullanici = userEvent.setup();
  takvimiOlustur();

  await kullanici.click(await screen.findByRole('button', { name: '16 Eylül: antrenman yok' }));

  expect(await screen.findByText('gun detayi: 2026-09-16')).toBeInTheDocument();
});

test('aralikta antrenman yoksa bos durum metni gorunur; hedef yokken hedef satirlari gorunmez', async () => {
  takvimSunucusu(BOS_OZET);
  takvimiOlustur();

  expect(await screen.findByText('Bu hafta antrenman yok.')).toBeInTheDocument();
  expect(screen.queryByText('Hedef serisi')).not.toBeInTheDocument();
});
