import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import { AuthProvider } from '../auth/AuthContext';
import { session } from '../auth/session';
import TodayPage from './TodayPage';
import type { components } from '../api/schema';

type ExerciseResponse = components['schemas']['ExerciseResponse'];
type SessionResponse = components['schemas']['SessionResponse'];
type SetEntryResponse = components['schemas']['SetEntryResponse'];
type RecordType = components['schemas']['RecordType'];

function testeOzelSorguIstemcisi(): QueryClient {
  // Retry kapali -- basarisiz bir istek test zaman asimina kadar yeniden denenmesin (Task 3 kurali).
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function bugunSayfasiniOlustur() {
  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<TodayPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

const EGZERSIZLER: ExerciseResponse[] = [
  { id: 1, name: 'Bench Press', category: 'Push', isArchived: false, isGlobal: true, media: [] },
  { id: 2, name: 'Squat', category: 'Legs', isArchived: false, isGlobal: true, media: [] },
];

/**
 * Bellek-ici sahte bir sunucu durumu kurar: acik oturum, o oturumun setleri ve egzersiz
 * listesi. `POST /api/sets` gercek backend gibi davranir -- oturum yoksa kendiliginden acar,
 * yeni seti listeye ekler. `recordTypeUret`, testin hangi seti "rekor" olarak isaretlemek
 * istedigine karar vermesini saglar (varsayilan: hicbiri).
 */
function sahteSunucuyuKur(
  opsiyonlar: {
    baslangicOturumu?: SessionResponse | null;
    recordTypeUret?: (govde: { exerciseId: number; weight: number; reps: number }) => RecordType;
  } = {},
) {
  let oturum: SessionResponse | null = opsiyonlar.baslangicOturumu ?? null;
  let setler: SetEntryResponse[] = [];
  let siradakiSetId = 100;
  const siradakiOturumId = 1;
  const gonderilenGovdeler: unknown[] = [];

  server.use(
    http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)),
    http.get('/api/sessions/open', () => {
      if (!oturum) {
        return HttpResponse.json({ title: 'Not Found', status: 404 }, { status: 404 });
      }
      return HttpResponse.json(oturum);
    }),
    http.get('/api/sessions/:id/sets', () => HttpResponse.json(setler)),
    http.post('/api/sets', async ({ request }) => {
      const govde = (await request.json()) as { exerciseId: number; weight: number; reps: number; rir?: number | null };
      gonderilenGovdeler.push(govde);

      if (!oturum) {
        oturum = {
          id: siradakiOturumId,
          startedAt: new Date().toISOString(),
          endedAt: null,
          isOpen: true,
          templateId: null,
          templateName: null,
          notes: null,
          progress: [],
        };
      }

      const egzersiz = EGZERSIZLER.find((e) => e.id === govde.exerciseId);
      const yeniSet: SetEntryResponse = {
        id: siradakiSetId++,
        sessionId: oturum.id as number,
        exerciseId: govde.exerciseId,
        exerciseName: egzersiz?.name ?? 'Bilinmeyen',
        weight: govde.weight,
        reps: govde.reps,
        recordType: opsiyonlar.recordTypeUret?.(govde) ?? 'None',
        rir: govde.rir ?? null,
        createdAt: new Date().toISOString(),
      };
      setler = [...setler, yeniSet];
      return HttpResponse.json(yeniSet);
    }),
    http.post('/api/sessions/:id/finish', () => {
      if (oturum) {
        oturum = { ...oturum, endedAt: new Date().toISOString(), isOpen: false };
      }
      return HttpResponse.json(oturum);
    }),
  );

  return {
    sonGonderilenGovde: () => gonderilenGovdeler.at(-1),
  };
}

/**
 * `AddSetForm` bos durumda bile render edilir (spec) -- yani `<select>` ve `<label>` egzersiz
 * listesi gelmeden de DOM'dadir. Sadece etiketin varligini beklemek (`findByLabelText`) bir yaris
 * durumu yaratir: gonderim, ilk (varsayilan) egzersiz henuz secilmeden yapilabilir. Bu yuzden
 * her gonderimden once `<select>`in gercekten dolmus (varsayilan olarak "Bench Press" = id 1
 * secilmis) olmasini bekliyoruz.
 */
async function egzersizSecimineBekle() {
  await waitFor(() => expect(screen.getByLabelText('Egzersiz')).toHaveValue('1'));
}

async function setEkle(
  kullanici: ReturnType<typeof userEvent.setup>,
  agirlik: string,
  tekrar: string,
) {
  await kullanici.clear(screen.getByLabelText('Ağırlık (kg)'));
  await kullanici.type(screen.getByLabelText('Ağırlık (kg)'), agirlik);
  await kullanici.clear(screen.getByLabelText('Tekrar'));
  await kullanici.type(screen.getByLabelText('Tekrar'), tekrar);
  await kullanici.click(screen.getByRole('button', { name: 'Set Ekle' }));
}

beforeEach(() => {
  session.clear();
});

test('acik oturum yokken (404) bos durum gorunur ve set ekleme formu kullanilabilir', async () => {
  sahteSunucuyuKur();

  bugunSayfasiniOlustur();

  expect(await screen.findByText('Bugün henüz antrenman yok.')).toBeInTheDocument();
  expect(screen.getByLabelText('Egzersiz')).toBeInTheDocument();
  expect(screen.getByLabelText('Ağırlık (kg)')).toBeInTheDocument();
  expect(screen.getByLabelText('Tekrar')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Set Ekle' })).toBeInTheDocument();
});

test('set eklenince listede gorunur ve POST govdesi exerciseId, weight, reps tasir', async () => {
  const ortam = sahteSunucuyuKur();

  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  await setEkle(kullanici, '60', '8');

  expect(await screen.findByText('60 × 8')).toBeInTheDocument();
  expect(ortam.sonGonderilenGovde()).toMatchObject({ exerciseId: 1, weight: 60, reps: 8 });
});

test('recordType Weight donen set icin rekor rozeti gorunur', async () => {
  sahteSunucuyuKur({ recordTypeUret: () => 'Weight' });

  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  await setEkle(kullanici, '70', '5');

  expect(await screen.findByText(/ağırlık rekoru/)).toBeInTheDocument();
});

test('recordType None donen set icin rekor rozeti gorunmez', async () => {
  sahteSunucuyuKur({ recordTypeUret: () => 'None' });

  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  await setEkle(kullanici, '70', '5');

  await screen.findByText('70 × 5');
  expect(screen.queryByText(/rekoru/)).not.toBeInTheDocument();
});

test('agirlik 0 ile set eklenebilir', async () => {
  sahteSunucuyuKur();

  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  await setEkle(kullanici, '0', '12');

  expect(await screen.findByText('0 × 12')).toBeInTheDocument();
});

test('Antrenmani bitir POST finish cagirir ve oturum kapaninca dugme kaybolur', async () => {
  const acikOturum: SessionResponse = {
    id: 7,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: null,
    templateName: null,
    notes: null,
    progress: [],
  };
  sahteSunucuyuKur({ baslangicOturumu: acikOturum });

  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  const dugme = await screen.findByRole('button', { name: 'Antrenmanı bitir' });
  await kullanici.click(dugme);

  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Antrenmanı bitir' })).not.toBeInTheDocument(),
  );
});

test('sunucu 400 donerse detay gosterilir ve form icerigi kaybolmaz', async () => {
  sahteSunucuyuKur();
  server.use(
    http.post('/api/sets', () =>
      HttpResponse.json(
        { title: 'Geçersiz istek', detail: 'Bu egzersiz artık kullanılamıyor.', status: 400 },
        { status: 400 },
      ),
    ),
  );

  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  await setEkle(kullanici, '60', '8');

  expect(await screen.findByRole('alert')).toHaveTextContent('Bu egzersiz artık kullanılamıyor.');
  expect(screen.getByLabelText('Ağırlık (kg)')).toHaveValue('60');
  expect(screen.getByLabelText('Tekrar')).toHaveValue('8');
});

test('ag hatasi: baglanti yok mesaji gosterilir ve form icerigi kaybolmaz', async () => {
  sahteSunucuyuKur();
  server.use(http.post('/api/sets', () => HttpResponse.error()));

  const kullanici = userEvent.setup();
  bugunSayfasiniOlustur();

  await egzersizSecimineBekle();
  await setEkle(kullanici, '60', '8');

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Bağlantı yok. Set kaydedilmedi, tekrar deneyin.',
  );
  expect(screen.getByLabelText('Ağırlık (kg)')).toHaveValue('60');
  expect(screen.getByLabelText('Tekrar')).toHaveValue('8');
});
