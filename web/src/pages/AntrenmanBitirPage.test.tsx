import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import { AuthProvider } from '../auth/AuthContext';
import { session } from '../auth/session';
import AntrenmanBitirPage from './AntrenmanBitirPage';
import { PageTitleProvider } from '../ui/PageTitleContext';
import type { components } from '../api/schema';

type SessionResponse = components['schemas']['SessionResponse'];

const ACIK_OTURUM: SessionResponse = {
  id: 7,
  startedAt: new Date().toISOString(),
  endedAt: null,
  isOpen: true,
  templateId: null,
  templateName: null,
  notes: null,
  progress: [],
};

/** Acik oturumu ve bitirme ucunu taklit eder; bitirme govdelerini toplar. */
function sahteSunucuyuKur(opsiyonlar: { oturum?: SessionResponse | null; bitirmeHatasi?: boolean } = {}) {
  const oturum = opsiyonlar.oturum === undefined ? ACIK_OTURUM : opsiyonlar.oturum;
  const bitirmeGovdeleri: unknown[] = [];
  server.use(
    http.get('/api/sessions/open', () =>
      oturum
        ? HttpResponse.json(oturum)
        : HttpResponse.json({ title: 'Not Found', status: 404 }, { status: 404 }),
    ),
    http.post('/api/sessions/:id/finish', async ({ request }) => {
      bitirmeGovdeleri.push(await request.json());
      if (opsiyonlar.bitirmeHatasi) {
        return HttpResponse.json({ title: 'Hata', status: 500 }, { status: 500 });
      }
      return HttpResponse.json({ ...ACIK_OTURUM, isOpen: false, endedAt: new Date().toISOString() });
    }),
  );
  return { bitirmeGovdeleri: () => bitirmeGovdeleri };
}

/** Sayfaya antrenman ekranindan gelinmis gibi acar (gecmiste `/antrenman` var) -- "Devam et" oraya doner. */
function sayfayiOlustur() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <PageTitleProvider>
          <MemoryRouter initialEntries={['/antrenman', '/antrenman/bitir']} initialIndex={1}>
            <Routes>
              <Route path="/" element={<p>ana sayfa</p>} />
              <Route path="/antrenman" element={<p>antrenman sayfasi</p>} />
              <Route path="/antrenman/bitir" element={<AntrenmanBitirPage />} />
            </Routes>
          </MemoryRouter>
        </PageTitleProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  session.clear();
});

/** Kadran Orta'da acilir: hic dokunmadan bitiren kullanicinin gonderdigi zorluk budur. */
test('varsayilan kademe Orta ile bitirilir ve ana sayfaya donulur', async () => {
  const ortam = sahteSunucuyuKur();
  sayfayiOlustur();

  await userEvent.click(await screen.findByRole('button', { name: 'Antrenmanı bitir' }));

  expect(await screen.findByText('ana sayfa')).toBeInTheDocument();
  expect(ortam.bitirmeGovdeleri()).toEqual([{ difficulty: 'Medium' }]);
});

/** Web'in eski uc secenekli satiri "Cok kolay" ve "Maksimal"i hic gonderemiyordu (#153'un web yarisi). */
test('kadranda secilen kademe gonderilir', async () => {
  const ortam = sahteSunucuyuKur();
  sayfayiOlustur();

  await userEvent.click(await screen.findByRole('button', { name: 'Maksimal' }));
  await userEvent.click(screen.getByRole('button', { name: 'Antrenmanı bitir' }));

  await waitFor(() => expect(ortam.bitirmeGovdeleri()).toEqual([{ difficulty: 'Maximal' }]));
});

test('Atla antrenmani zorluksuz bitirir', async () => {
  const ortam = sahteSunucuyuKur();
  sayfayiOlustur();

  await userEvent.click(await screen.findByRole('button', { name: 'Atla' }));

  await waitFor(() => expect(ortam.bitirmeGovdeleri()).toEqual([{ difficulty: null }]));
});

/** "Devam et" vazgecmedir, iptal degil: istek gitmez, oturum acik kalir, bir onceki sayfaya donulur. */
test('Devam et antrenmani bitirmeden geri doner', async () => {
  const ortam = sahteSunucuyuKur();
  sayfayiOlustur();

  await userEvent.click(await screen.findByRole('button', { name: 'Devam et' }));

  expect(await screen.findByText('antrenman sayfasi')).toBeInTheDocument();
  expect(ortam.bitirmeGovdeleri()).toEqual([]);
});

/** Kapatilacak antrenman yoksa (dogrudan acildi ya da baska yerde kapandi) bos kadran gosterilmez. */
test('acik antrenman yoksa antrenman sayfasina yonlendirilir', async () => {
  sahteSunucuyuKur({ oturum: null });
  sayfayiOlustur();

  expect(await screen.findByText('antrenman sayfasi')).toBeInTheDocument();
});

test('bitirme hatasi sayfada gosterilir', async () => {
  sahteSunucuyuKur({ bitirmeHatasi: true });
  sayfayiOlustur();

  await userEvent.click(await screen.findByRole('button', { name: 'Antrenmanı bitir' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Antrenman bitirilemedi. Lütfen tekrar deneyin.');
});
