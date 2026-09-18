import { render, screen } from '@testing-library/react';
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
        <AnaSayfaPage />
      </PageTitleProvider>
    </QueryClientProvider>,
  );
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
});

/**
 * Issue #119/#120: Ana Sayfa artık sadece Takvim gösterir -- antrenman başlatma/devam etme
 * "+" ile açılan ayrı AntrenmanPage'e taşındı. Bu yüzden burada SADECE Takvim'in göründüğü ve
 * başlığın doğru bildirildiği doğrulanır; antrenman akışı AntrenmanPage.test.tsx'te sınanır.
 */
test('Takvim gorunur ve baslik Ana sayfa olarak bildirilir', async () => {
  anaSayfayiOlustur();

  expect(await screen.findByRole('region', { name: 'Takvim' })).toBeInTheDocument();
  expect(screen.getByText('baslik=Ana sayfa')).toBeInTheDocument();
});
