import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import SablonDuzenlePage from './SablonDuzenlePage';
import type { components } from '../api/schema';

type ExerciseResponse = components['schemas']['ExerciseResponse'];
type TemplateResponse = components['schemas']['TemplateResponse'];

function duzenleyiciyiOlustur(yol: string) {
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <MemoryRouter initialEntries={[yol]}>
        <Routes>
          <Route path="/templates" element={<p>Sablon listesi</p>} />
          <Route path="/templates/new" element={<SablonDuzenlePage />} />
          <Route path="/templates/:id" element={<SablonDuzenlePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Alfabetik sira: Bench Press (1), Deadlift (3), Squat (2).
const EGZERSIZLER: ExerciseResponse[] = [
  { id: 1, name: 'Bench Press', category: 'Push', isArchived: false, isGlobal: true, media: [] },
  { id: 2, name: 'Squat', category: 'Legs', isArchived: false, isGlobal: true, media: [] },
  { id: 3, name: 'Deadlift', category: 'Pull', isArchived: false, isGlobal: true, media: [] },
];

function ornekSablon(gecersizler: Partial<TemplateResponse> = {}): TemplateResponse {
  return { id: 7, name: 'Push Day', createdAt: '2026-09-01T08:00:00Z', exercises: [], ...gecersizler };
}

async function hareketEkleHazir() {
  const dugme = screen.getByRole('button', { name: 'Hareket ekle' });
  await waitFor(() => expect(dugme).toBeEnabled());
  return dugme;
}

test('yeni sablon hareketleri sirayla plannedSets ve restSeconds ile gonderir; asagi tasimak sirayi degistirir', async () => {
  let gonderilen: unknown = null;
  server.use(
    http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)),
    http.post('/api/templates', async ({ request }) => {
      gonderilen = await request.json();
      return HttpResponse.json(ornekSablon(), { status: 201 });
    }),
  );
  const kullanici = userEvent.setup();
  duzenleyiciyiOlustur('/templates/new');

  await kullanici.type(screen.getByLabelText('Şablon adı'), 'Push Day');
  const ekle = await hareketEkleHazir();
  await kullanici.click(ekle);
  await kullanici.click(ekle);

  // Yeni satir henuz secilmemis ilk (alfabetik) egzersizi alir. Secici artik id degil AD gosterir.
  expect(screen.getByLabelText('1. hareket: Egzersiz')).toHaveValue('Bench Press');
  expect(screen.getByLabelText('2. hareket: Egzersiz')).toHaveValue('Deadlift');

  await kullanici.clear(screen.getByLabelText('1. hareket: Hedef set'));
  await kullanici.type(screen.getByLabelText('1. hareket: Hedef set'), '4');
  await kullanici.selectOptions(screen.getByLabelText('2. hareket: Dinlenme'), '180');
  await kullanici.click(screen.getByRole('button', { name: '1. hareket: aşağı taşı' }));
  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Sablon listesi')).toBeInTheDocument();
  expect(gonderilen).toEqual({
    name: 'Push Day',
    exercises: [
      { exerciseId: 3, plannedSets: 3, restSeconds: 180 },
      { exerciseId: 1, plannedSets: 4, restSeconds: 90 },
    ],
  });
});

test('ayni egzersiz ikinci satirda secilemez', async () => {
  server.use(http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)));
  const kullanici = userEvent.setup();
  duzenleyiciyiOlustur('/templates/new');

  const ekle = await hareketEkleHazir();
  await kullanici.click(ekle);
  await kullanici.click(ekle);

  // Secenekler yalnizca secici ACIKKEN vardir; liste secicinin kendi `aria-controls`u ile bulunur.
  await kullanici.click(screen.getByLabelText('2. hareket: Egzersiz'));
  const ikinciListe = screen.getByRole('listbox');
  expect(within(ikinciListe).getByRole('option', { name: 'Bench Press' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(within(ikinciListe).getByRole('option', { name: 'Squat' })).toHaveAttribute(
    'aria-disabled',
    'false',
  );

  await kullanici.click(screen.getByLabelText('1. hareket: Egzersiz'));
  const ilkListe = screen.getByRole('listbox');
  expect(within(ilkListe).getByRole('option', { name: 'Deadlift' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
});

test('ayni adli sablon icin sunucunun 409 mesaji gosterilir', async () => {
  server.use(
    http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)),
    http.post('/api/templates', () =>
      HttpResponse.json(
        { title: 'Çakışma', status: 409, detail: "'Push Day' adında bir şablonunuz zaten var." },
        { status: 409 },
      ),
    ),
  );
  const kullanici = userEvent.setup();
  duzenleyiciyiOlustur('/templates/new');

  await kullanici.type(screen.getByLabelText('Şablon adı'), 'Push Day');
  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByRole('alert')).toHaveTextContent("'Push Day' adında bir şablonunuz zaten var.");
  expect(screen.queryByText('Sablon listesi')).not.toBeInTheDocument();
});

test('silme iki adimli onay ister; DELETE yalnizca Evet sil ile gider', async () => {
  let silmeSayisi = 0;
  server.use(
    http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)),
    http.get('/api/templates/7', () => HttpResponse.json(ornekSablon())),
    http.delete('/api/templates/7', () => {
      silmeSayisi += 1;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  const kullanici = userEvent.setup();
  duzenleyiciyiOlustur('/templates/7');

  await kullanici.click(await screen.findByRole('button', { name: 'Şablonu sil' }));
  expect(screen.getByText(/Silmek istediğine emin misin\?/)).toBeInTheDocument();
  expect(silmeSayisi).toBe(0);
  // F3 (review bulgusu): "Şablonu sil" unmount olunca odak body'ye DUSMEMELI -- acilan onayin
  // "Vazgeç" dugmesine tasinmali.
  expect(screen.getByRole('button', { name: 'Vazgeç' })).toHaveFocus();

  await kullanici.click(screen.getByRole('button', { name: 'Vazgeç' }));
  expect(screen.queryByText(/Silmek istediğine emin misin\?/)).not.toBeInTheDocument();
  // Vazgec de kendisi unmount olur -- odak "Şablonu sil"e GERI donmeli.
  expect(screen.getByRole('button', { name: 'Şablonu sil' })).toHaveFocus();

  await kullanici.click(screen.getByRole('button', { name: 'Şablonu sil' }));
  expect(screen.getByRole('button', { name: 'Vazgeç' })).toHaveFocus();
  await kullanici.click(screen.getByRole('button', { name: 'Evet, sil' }));

  expect(await screen.findByText('Sablon listesi')).toBeInTheDocument();
  expect(silmeSayisi).toBe(1);
});

test('mevcut sablon yuklenir: arsivli hareket hapi ve listede olmayan dinlenme degeri korunur, PUT gonderilir', async () => {
  let gonderilen: unknown = null;
  server.use(
    http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)),
    http.get('/api/templates/7', () =>
      HttpResponse.json(
        ornekSablon({
          exercises: [
            { id: 1, exerciseId: 9, exerciseName: 'Eski Hareket', category: 'Other', isArchived: true, orderIndex: 0, plannedSets: 2, restSeconds: 45 },
            { id: 2, exerciseId: 1, exerciseName: 'Bench Press', category: 'Push', isArchived: false, orderIndex: 1, plannedSets: 4, restSeconds: 120 },
          ],
        }),
      ),
    ),
    http.put('/api/templates/7', async ({ request }) => {
      gonderilen = await request.json();
      return HttpResponse.json(ornekSablon());
    }),
  );
  const kullanici = userEvent.setup();
  duzenleyiciyiOlustur('/templates/7');

  expect(await screen.findByDisplayValue('Push Day')).toBeInTheDocument();
  expect(screen.getByText('Artık kullanılmıyor')).toBeInTheDocument();
  // Arsivli hareket secim listesinde YOK ama satirda kalir: secicide adiyla gorunmeye devam eder.
  expect(screen.getByLabelText('1. hareket: Egzersiz')).toHaveValue('Eski Hareket');
  expect(screen.getByLabelText('1. hareket: Dinlenme')).toHaveValue('45');
  expect(screen.getByLabelText('2. hareket: Dinlenme')).toHaveValue('120');

  await kullanici.click(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Sablon listesi')).toBeInTheDocument();
  expect(gonderilen).toEqual({
    name: 'Push Day',
    exercises: [
      { exerciseId: 9, plannedSets: 2, restSeconds: 45 },
      { exerciseId: 1, plannedSets: 4, restSeconds: 120 },
    ],
  });
});
