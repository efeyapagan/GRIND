import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import AnaSayfaPage from './AnaSayfaPage';
import { PageTitleProvider, useHeaderTitle } from '../ui/PageTitleContext';

function testeOzelSorguIstemcisi(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function Baslik() {
  return <p>{`baslik=${useHeaderTitle()}`}</p>;
}

function anaSayfayiOlustur() {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <PageTitleProvider>
        <Baslik />
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<AnaSayfaPage />} />
            <Route path="/antrenman" element={<p>Antrenman ekrani</p>} />
          </Routes>
        </MemoryRouter>
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

/** Acik oturum yok: sunucu 404 doner, `useOpenSession` bunu bos duruma cevirir (bir hata degil). */
function acikOturumYok() {
  server.use(http.get('/api/sessions/open', () => new HttpResponse(null, { status: 404 })));
}

beforeEach(() => {
  server.use(
    http.get('/api/stats/calendar', ({ request }) => {
      const url = new URL(request.url);
      return HttpResponse.json({
        from: url.searchParams.get('From'),
        to: url.searchParams.get('To'),
        days: [],
        trainedDayCount: 0,
        currentWeekStreak: 0,
        longestWeekStreak: 0,
        thisWeekTrainedDays: 0,
        weeklyTargetDays: null,
        currentTargetStreak: null,
      });
    }),
  );
  acikOturumYok();
});

/**
 * Issue #119/#120: Ana Sayfa'nin cekirdegi Takvim -- antrenmanin kendisi "+" ile acilan ayri
 * AntrenmanPage'de. (#175 bunu bozmaz: asagidaki kart yalnizca ACIK bir antrenman varken cikar.)
 */
test('Takvim gorunur ve baslik Ana sayfa olarak bildirilir', async () => {
  anaSayfayiOlustur();

  expect(await screen.findByRole('region', { name: 'Takvim' })).toBeInTheDocument();
  expect(screen.getByText('baslik=Ana sayfa')).toBeInTheDocument();
});

/**
 * Issue #175: uygulama/sekme kapatilip acilinca kullanici Ana sayfada acilir ve devam eden
 * antrenmani goremiyordu -- veri sunucuda duruyor olsa da onun icin antrenman "kaybolmus"
 * oluyordu. Kart acik oturumu gorunur kilar ve tek tiklamayla antrenmana dondurur.
 */
test('acik antrenman varken Devam et karti antrenman ekranina goturur', async () => {
  server.use(
    http.get('/api/sessions/open', () =>
      HttpResponse.json({
        id: 7,
        startedAt: '2026-09-20T09:00:00Z',
        endedAt: null,
        isOpen: true,
        templateId: 3,
        templateName: 'Push Day A',
        progress: [],
      }),
    ),
  );
  const kullanici = userEvent.setup();
  anaSayfayiOlustur();

  expect(await screen.findByText('Push Day A')).toBeInTheDocument();
  expect(screen.getByText('Başlangıç 12:00')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Devam et' }));

  expect(await screen.findByText('Antrenman ekrani')).toBeInTheDocument();
});

test('acik antrenman yokken kart cizilmez', async () => {
  anaSayfayiOlustur();

  expect(await screen.findByRole('region', { name: 'Takvim' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Devam et' })).not.toBeInTheDocument();
});
