import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import GunDetayPage from './GunDetayPage';
import { PageTitleProvider } from '../ui/PageTitleContext';

const GUN = '2026-09-14';

/** Gunun oturumlari; `/api/history` sayfali doner (From=To=gun). */
function gunSunucusu(oturumlar: unknown[], hata = false) {
  const istenenAraliklar: string[] = [];
  server.use(
    http.get('/api/history', ({ request }) => {
      const url = new URL(request.url);
      istenenAraliklar.push(`${url.searchParams.get('From')}..${url.searchParams.get('To')}`);
      if (hata) {
        return HttpResponse.json({ title: 'Hata', status: 500 }, { status: 500 });
      }
      return HttpResponse.json({ items: oturumlar, page: 1, pageSize: 20, totalCount: oturumlar.length, totalPages: 1 });
    }),
  );
  return istenenAraliklar;
}

function set(id: number, exerciseName: string, weight: number, reps: number, rir: number | null) {
  return {
    id,
    sessionId: 1,
    exerciseId: 1,
    exerciseName,
    weight,
    reps,
    rir,
    recordType: 'None',
    createdAt: `${GUN}T09:0${id}:00Z`,
    restSeconds: null,
  };
}

function oturum(sessionId: number, templateName: string | null, sets: ReturnType<typeof set>[]) {
  return {
    sessionId,
    startedAt: `${GUN}T09:00:00Z`,
    endedAt: `${GUN}T10:00:00Z`,
    templateName,
    notes: null,
    totalVolume: 1000,
    setCount: sets.length,
    durationSeconds: 3600,
    sets,
  };
}

function sayfayiOlustur() {
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <PageTitleProvider>
        <MemoryRouter initialEntries={[`/gun/${GUN}`]}>
          <Routes>
            <Route path="/gun/:gun" element={<GunDetayPage />} />
          </Routes>
        </MemoryRouter>
      </PageTitleProvider>
    </QueryClientProvider>,
  );
}

test('gunun antrenmani once ozet olarak gorunur, ok ile setler acilir', async () => {
  const araliklar = gunSunucusu([
    oturum(1, 'Push Day', [set(1, 'Bench Press', 60, 8, 2), set(2, 'Bench Press', 62.5, 6, null)]),
  ]);
  const kullanici = userEvent.setup();
  sayfayiOlustur();

  // Ozet: sablon adi ve sayilar -- setler HENUZ kapali.
  expect(await screen.findByText('Push Day')).toBeInTheDocument();
  expect(araliklar).toEqual([`${GUN}..${GUN}`]);
  // <details> kapaliyken icerik DOM'da durur; kapalilik `open` yoklugundan okunur (AntrenmanPage ile ayni).
  expect(screen.getByText('Push Day').closest('details')).not.toHaveAttribute('open');

  // Karti acan oge bir <summary>; gecmis testleriyle ayni sekilde metninden tiklanir.
  await kullanici.click(screen.getByText('Push Day'));

  // Acilinca: hangi harekette kac set, her setin agirlik x tekrar ve RIR'i.
  expect(screen.getByText('Push Day').closest('details')).toHaveAttribute('open');
  expect(screen.getByText('Bench Press')).toBeInTheDocument();
  expect(screen.getByText('2 set')).toBeInTheDocument();
  expect(screen.getByText('RIR 2')).toBeInTheDocument();
});

test('gunde birden fazla antrenman varsa hepsi listelenir', async () => {
  gunSunucusu([
    oturum(1, 'Push Day', [set(1, 'Bench Press', 60, 8, 2)]),
    oturum(2, null, [set(2, 'Squat', 100, 5, 1)]),
  ]);
  sayfayiOlustur();

  expect(await screen.findByText('Push Day')).toBeInTheDocument();
  // Sablonsuz antrenman "Serbest" etiketiyle gorunur.
  expect(screen.getByText('Serbest')).toBeInTheDocument();
});

/** Takvimden bakilan bir gunde silme yolu ACILMAZ -- yanlislikla veri kaybettirmesin (silme Gecmis'te). */
test('kart salt-okunurdur: silme yolu yoktur', async () => {
  gunSunucusu([oturum(1, 'Push Day', [set(1, 'Bench Press', 60, 8, 2)])]);
  const kullanici = userEvent.setup();
  sayfayiOlustur();

  await kullanici.click(await screen.findByText('Push Day'));

  expect(screen.queryByRole('button', { name: 'Antrenmanı sil' })).not.toBeInTheDocument();
});

test('antrenmansiz gunde bos durum metni cikar', async () => {
  gunSunucusu([]);
  sayfayiOlustur();

  expect(await screen.findByText('Bu gün antrenman yok.')).toBeInTheDocument();
});

test('istek basarisizsa hata gosterilir', async () => {
  gunSunucusu([], true);
  sayfayiOlustur();

  expect(await screen.findByRole('alert')).toHaveTextContent('Günün antrenmanları alınamadı.');
});
