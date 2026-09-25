import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import { AuthProvider } from '../auth/AuthContext';
import { session } from '../auth/session';
import AntrenmanPage from './AntrenmanPage';
import { PageTitleProvider } from '../ui/PageTitleContext';
import type { components } from '../api/schema';
import { tamMetin } from '../test/metin';

type ExerciseResponse = components['schemas']['ExerciseResponse'];
type SessionResponse = components['schemas']['SessionResponse'];
type SetEntryResponse = components['schemas']['SetEntryResponse'];
type RecordType = components['schemas']['RecordType'];
type TemplateResponse = components['schemas']['TemplateResponse'];
type SessionProgressResponse = components['schemas']['SessionProgressResponse'];

function testeOzelSorguIstemcisi(): QueryClient {
  // Retry kapali -- basarisiz bir istek test zaman asimina kadar yeniden denenmesin (Task 3 kurali).
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

/** SablonOlusturCagrisi'nin (issue #61) `state.donus`unu ekrana yazar -- gercek SablonDuzenlePage
 * yerine sahte bir hedef, sadece navigasyonun DOGRU state'i tasidigini dogrulamak icin. */
function AlinanRota() {
  const state = useLocation().state as { donus?: string; hareketler?: unknown } | null;
  return (
    <>
      <p>{`donus=${state?.donus}`}</p>
      {/* #209: "Sablon olarak kaydet" formun baslangic satirlarini da tasir. */}
      {state?.hareketler !== undefined && <p>{`hareketler=${JSON.stringify(state.hareketler)}`}</p>}
    </>
  );
}

// `usePageTitle` (issue #65) bir `PageTitleProvider` ister -- App.tsx'in gercek kabugu bunu
// saglar, testte de aynisi sarilmali.
/**
 * `client` opsiyoneldir: issue #190'daki "sayfa degisip geri donulunce" testi ayni query client'i
 * ikinci kez gecirerek bir unmount/remount'u (sekme degisimi) benzetir -- gercek uygulamada
 * QueryClient de, kalici depo (localStorage) da bilesenin unmount'undan ETKILENMEZ.
 */
function antrenmanSayfasiniOlustur(client: QueryClient = testeOzelSorguIstemcisi()) {
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <PageTitleProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<AntrenmanPage />} />
              <Route path="/antrenman/bitir" element={<p>bitirme sayfasi</p>} />
              <Route path="/templates/new" element={<AlinanRota />} />
            </Routes>
          </MemoryRouter>
        </PageTitleProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

const EGZERSIZLER: ExerciseResponse[] = [
  { id: 1, name: 'Bench Press', category: 'Push', isArchived: false, isGlobal: true, media: [] },
  { id: 2, name: 'Squat', category: 'Legs', isArchived: false, isGlobal: true, media: [] },
];

/** Acik oturumu "set girilmis" hale getirir -- "Antrenmani bitir" ancak o zaman gorunur (#47). */
function girilmisSet(sessionId: number): SetEntryResponse {
  return {
    id: 500,
    sessionId,
    exerciseId: 1,
    exerciseName: 'Bench Press',
    weight: 60,
    reps: 8,
    recordType: 'None',
    rir: null,
    createdAt: '2026-09-14T09:00:00Z',
  };
}

const PUSH_DAY: TemplateResponse = {
  id: 10,
  name: 'Push Day',
  createdAt: '2026-09-01T08:00:00Z',
  exercises: [
    { id: 1, exerciseId: 1, exerciseName: 'Bench Press', category: 'Push', isArchived: false, orderIndex: 0, plannedSets: 4, restSeconds: 120 },
    { id: 2, exerciseId: 2, exerciseName: 'Squat', category: 'Legs', isArchived: false, orderIndex: 1, plannedSets: 3, restSeconds: 0 },
  ],
};

function sablonluOturum(progress: SessionProgressResponse[]): SessionResponse {
  return {
    id: 20,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: 10,
    templateName: 'Push Day',
    notes: null,
    progress,
  };
}

function ilerleme(
  exerciseId: number,
  exerciseName: string,
  // null = hedefsiz: antrenmana sonradan eklenen hareket (#62).
  plannedSets: number | null,
  completedSets: number,
  restSeconds = 90,
): SessionProgressResponse {
  return { exerciseId, exerciseName, plannedSets, completedSets, restSeconds };
}

// Hedefli ("2 / 4 set") ve hedefsiz ("2 set", #62) kartlar.
const HAREKET_KARTI_ADI = /, \d+( \/ \d+)? set$/;

/**
 * Bellek-ici sahte bir sunucu durumu kurar: acik oturum, o oturumun setleri, egzersiz listesi,
 * sablon listesi ve hareket ilerleme ucu. `POST /api/sets` gercek backend gibi davranir -- oturum yoksa
 * kendiliginden acar, yeni seti listeye ekler ve ilgili hareketin `completedSets` sayacini artirir.
 * `POST /api/sessions` acik oturum varsa onu OLDUGU GIBI 200 ile doner (templateId UYGULANMAZ),
 * yoksa sablonun hareketleriyle 201 doner. `recordTypeUret`, testin hangi seti "rekor" olarak
 * isaretlemek istedigine karar vermesini saglar (varsayilan: hicbiri).
 */
function sahteSunucuyuKur(
  opsiyonlar: {
    baslangicOturumu?: SessionResponse | null;
    // Acik oturumun ZATEN setleri varmis gibi baslatir: "Antrenmani bitir" yalnizca set
    // girilmis oturumda gorunur (issue #47), bu yuzden o akisi sinayan testler set ister.
    baslangicSetleri?: SetEntryResponse[];
    recordTypeUret?: (govde: { exerciseId: number; weight: number; reps: number }) => RecordType;
    sablonlar?: TemplateResponse[];
    // #229: PUT sira istegi 500 doner.
    siraHatasi?: boolean;
  } = {},
) {
  let oturum: SessionResponse | null = opsiyonlar.baslangicOturumu ?? null;
  let setler: SetEntryResponse[] = opsiyonlar.baslangicSetleri ?? [];
  let siradakiSetId = 100;
  const siradakiOturumId = 1;
  const gonderilenGovdeler: unknown[] = [];
  const baslatmaGovdeleri: unknown[] = [];
  const ilerlemeAramalari: string[] = [];
  const silinenOturumlar: number[] = [];
  const silinenSetler: number[] = [];
  const eklenenHareketler: number[] = [];
  const kaldirilanHareketler: number[] = [];
  const bitirmeGovdeleri: unknown[] = [];
  const siraGovdeleri: unknown[] = [];

  server.use(
    http.get('/api/exercises', () => HttpResponse.json(EGZERSIZLER)),
    http.get('/api/sessions/open', () => {
      if (!oturum) {
        return HttpResponse.json({ title: 'Not Found', status: 404 }, { status: 404 });
      }
      return HttpResponse.json(oturum);
    }),
    http.get('/api/sessions/:id/sets', () => HttpResponse.json(setler)),
    http.get('/api/templates', () => HttpResponse.json(opsiyonlar.sablonlar ?? [])),
    // Antrenman yokken Takvim (#81) gorunen ayi ister.
    http.get('/api/stats/calendar', () =>
      HttpResponse.json({
        days: [],
        trainedDayCount: 0,
        currentWeekStreak: 0,
        longestWeekStreak: 0,
        thisWeekTrainedDays: 0,
        weeklyTargetDays: null,
        currentTargetStreak: null,
      }),
    ),
    http.get('/api/stats/exercises/:id/progress', ({ request, params }) => {
      ilerlemeAramalari.push(new URL(request.url).pathname);
      return HttpResponse.json({ exerciseId: Number(params.id), exerciseName: '', points: [] });
    }),
    // Gercek backend gibi: acik oturum varsa 200 ile oldugu gibi doner (templateId UYGULANMAZ),
    // yoksa sablonun hareketleriyle 201.
    http.post('/api/sessions', async ({ request }) => {
      const govde = (await request.json()) as { templateId?: number | null };
      baslatmaGovdeleri.push(govde);
      if (oturum) {
        return HttpResponse.json(oturum, { status: 200 });
      }
      const sablon = opsiyonlar.sablonlar?.find((s) => s.id === govde.templateId);
      oturum = {
        id: siradakiOturumId,
        startedAt: new Date().toISOString(),
        endedAt: null,
        isOpen: true,
        templateId: sablon?.id ?? null,
        templateName: sablon?.name ?? null,
        notes: null,
        progress: (sablon?.exercises ?? []).map((hareket) => ({
          exerciseId: hareket.exerciseId,
          exerciseName: hareket.exerciseName,
          plannedSets: hareket.plannedSets,
          completedSets: 0,
          restSeconds: hareket.restSeconds,
        })),
      };
      return HttpResponse.json(oturum, { status: 201 });
    }),
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
      // Sunucu ilerlemeyi gercek set sayisindan hesaplar; sahte sunucu da sayaci artirir. Hareket
      // antrenmanin listesinde yoksa gercek backend gibi sona HEDEFSIZ ekler (#62).
      const mevcutIlerleme = oturum.progress ?? [];
      oturum = {
        ...oturum,
        progress: mevcutIlerleme.some((hareket) => hareket.exerciseId === govde.exerciseId)
          ? mevcutIlerleme.map((hareket) =>
              hareket.exerciseId === govde.exerciseId
                ? { ...hareket, completedSets: (hareket.completedSets ?? 0) + 1 }
                : hareket,
            )
          : [...mevcutIlerleme, ilerleme(govde.exerciseId, egzersiz?.name ?? 'Bilinmeyen', null, 1)],
      };
      return HttpResponse.json(yeniSet);
    }),
    http.post('/api/sessions/:id/finish', async ({ request }) => {
      bitirmeGovdeleri.push(await request.json());
      if (oturum) {
        oturum = { ...oturum, endedAt: new Date().toISOString(), isOpen: false };
      }
      return HttpResponse.json(oturum);
    }),
    // Gercek backend gibi 204 (govde yok): oturum ve setleri gider, bos duruma donulur.
    http.delete('/api/sessions/:id', ({ params }) => {
      silinenOturumlar.push(Number(params.id));
      oturum = null;
      setler = [];
      return new HttpResponse(null, { status: 204 });
    }),
    // Gercek backend gibi: yalnizca gonderilen alanlari uygular, guncel seti doner (#57).
    http.patch('/api/sets/:id', async ({ params, request }) => {
      const govde = (await request.json()) as { weight?: number; reps?: number; rir?: number };
      setler = setler.map((kayit) => (kayit.id === Number(params.id) ? { ...kayit, ...govde } : kayit));
      return HttpResponse.json(setler.find((kayit) => kayit.id === Number(params.id)));
    }),
    // Gercek backend gibi 204: set gider, hareketin tamamlanan sayaci duser (#57).
    http.delete('/api/sets/:id', ({ params }) => {
      const silinen = setler.find((kayit) => kayit.id === Number(params.id));
      silinenSetler.push(Number(params.id));
      setler = setler.filter((kayit) => kayit.id !== Number(params.id));
      if (oturum && silinen) {
        oturum = {
          ...oturum,
          progress: (oturum.progress ?? []).map((hareket) =>
            hareket.exerciseId === silinen.exerciseId
              ? { ...hareket, completedSets: (hareket.completedSets ?? 1) - 1 }
              : hareket,
          ),
        };
      }
      return new HttpResponse(null, { status: 204 });
    }),
    // Gercek backend gibi: hareket sona hedefsiz eklenir, guncel oturum 201 ile doner (#62).
    http.post('/api/sessions/:id/exercises', async ({ request }) => {
      const govde = (await request.json()) as { exerciseId: number };
      eklenenHareketler.push(govde.exerciseId);
      const egzersiz = EGZERSIZLER.find((e) => e.id === govde.exerciseId);
      if (oturum) {
        oturum = {
          ...oturum,
          progress: [...(oturum.progress ?? []), ilerleme(govde.exerciseId, egzersiz?.name ?? 'Bilinmeyen', null, 0)],
        };
      }
      return HttpResponse.json(oturum, { status: 201 });
    }),
    // Gercek backend gibi: liste antrenmandakilerle birebir ayni olmali, guncel oturum 200 ile doner (#229).
    // `siraHatasi` acikken 500 doner (iyimser sira geri alinmali).
    http.put('/api/sessions/:id/exercises/order', async ({ request }) => {
      const govde = (await request.json()) as { exerciseIds: number[] };
      siraGovdeleri.push(govde);
      if (opsiyonlar.siraHatasi) {
        return HttpResponse.json({ title: 'Sunucu hatası', status: 500 }, { status: 500 });
      }
      if (oturum) {
        const onceki = oturum.progress ?? [];
        oturum = {
          ...oturum,
          progress: govde.exerciseIds.map((id) => onceki.find((h) => h.exerciseId === id)!),
        };
      }
      return HttpResponse.json(oturum);
    }),
    // Gercek backend gibi 204: hareket ve bu antrenmandaki setleri gider (#60).
    http.delete('/api/sessions/:id/exercises/:exerciseId', ({ params }) => {
      const exerciseId = Number(params.exerciseId);
      kaldirilanHareketler.push(exerciseId);
      setler = setler.filter((kayit) => kayit.exerciseId !== exerciseId);
      if (oturum) {
        oturum = { ...oturum, progress: (oturum.progress ?? []).filter((h) => h.exerciseId !== exerciseId) };
      }
      return new HttpResponse(null, { status: 204 });
    }),
  );

  return {
    bitirmeGovdeleri: () => bitirmeGovdeleri,
    sonGonderilenGovde: () => gonderilenGovdeler.at(-1),
    baslatmaGovdeleri: () => baslatmaGovdeleri,
    ilerlemeAramalari: () => ilerlemeAramalari,
    silinenOturumlar: () => silinenOturumlar,
    silinenSetler: () => silinenSetler,
    eklenenHareketler: () => eklenenHareketler,
    kaldirilanHareketler: () => kaldirilanHareketler,
    siraGovdeleri: () => siraGovdeleri,
  };
}

/**
 * #62: acik antrenmanda panelde hareket secimi yoktur -- hareket karttan gelir. Set gondermeden once
 * varsayilan secimin (adiyla verilen hareketin) kartinin secili oldugu beklenir.
 */
async function seciliKartaBekle(ad: string) {
  await waitFor(() =>
    expect(screen.getByRole('button', { name: new RegExp(`^${ad}, `), pressed: true })).toBeInTheDocument(),
  );
}

/**
 * Dilim 3: set paneli kapali baslar. Form alanlariyla etkilesen her akis once paneli acar; panel zaten
 * aciksa (orn. hareket kartina dokunulduysa) bir sey yapmaz. Antrenman yokken "Set ekle" dugmesi acar;
 * acik antrenmanda (#62) o dugme yoktur, panel secili karta dokununca acilir.
 */
async function paneliAc(kullanici: ReturnType<typeof userEvent.setup>) {
  const acmaDugmesi = screen.queryByRole('button', { name: 'Set ekle', expanded: false });
  if (acmaDugmesi) {
    await kullanici.click(acmaDugmesi);
    return;
  }
  if (document.getElementById('set-paneli')?.hidden) {
    await kullanici.click(screen.getAllByRole('button', { name: HAREKET_KARTI_ADI, pressed: true })[0]);
  }
}

async function setEkle(
  kullanici: ReturnType<typeof userEvent.setup>,
  agirlik: string,
  tekrar: string,
) {
  await paneliAc(kullanici);
  await kullanici.clear(screen.getByLabelText('Ağırlık (kg)'));
  await kullanici.type(screen.getByLabelText('Ağırlık (kg)'), agirlik);
  await kullanici.clear(screen.getByLabelText('Tekrar'));
  await kullanici.type(screen.getByLabelText('Tekrar'), tekrar);
  await kullanici.click(screen.getByRole('button', { name: 'Set ekle' }));
}

beforeEach(() => {
  session.clear();
});

test('acik oturum yokken "antrenman yok" metni yok; set formu degil sablon olustur dugmesi cikar', async () => {
  // Issue #61: serbest antrenman arayuzden artik baslatilamaz -- set ekleme formu (Egzersiz/Agirlik/
  // Tekrar alanlari) acik antrenman OLMADAN hic render edilmez, yerine "+ Sablon oluştur" durur.
  // Issue #119/#120: Takvim artik bu sayfada degil, Ana Sayfa'da -- bu sayfa (eski Bugun, simdi "+"
  // ile acilan antrenman baslatma/devam sayfasi) sadece Sablonla basla + Sablon olustur gosterir.
  sahteSunucuyuKur();

  antrenmanSayfasiniOlustur();

  expect(await screen.findByRole('heading', { name: 'Şablonla başla' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Takvim' })).not.toBeInTheDocument();
  expect(screen.queryByText('Bugün henüz antrenman yok')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Egzersiz')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Ağırlık (kg)')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Tekrar')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Set ekle' })).not.toBeInTheDocument();

  const dugme = screen.getByRole('button', { name: 'Şablon oluştur' });
  expect(dugme).toBeInTheDocument();
});

test('set eklenince listede gorunur ve POST govdesi exerciseId, weight, reps tasir', async () => {
  const ortam = sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '60', '8');

  expect(await screen.findByText(tamMetin('60 kg × 8'))).toBeInTheDocument();
  expect(ortam.sonGonderilenGovde()).toMatchObject({ exerciseId: 1, weight: 60, reps: 8 });
  // Basarili gonderimden sonra odak agirlik alanina doner (spec Karar 6) -- ust uste ayni seti
  // girmek en sik akis, kullanici her seferinde alana tekrar tiklamak zorunda kalmamali.
  expect(screen.getByLabelText('Ağırlık (kg)')).toHaveFocus();
});

test('recordType Weight donen set icin rekor rozeti gorunur', async () => {
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]), recordTypeUret: () => 'Weight' });

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '70', '5');

  expect(await screen.findByText(/ağırlık rekoru/i)).toBeInTheDocument();
});

test('recordType Reps donen set icin rekor rozeti gorunur', async () => {
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]), recordTypeUret: () => 'Reps' });

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '70', '5');

  expect(await screen.findByText(/tekrar rekoru/i)).toBeInTheDocument();
});

test('recordType None donen set icin rekor rozeti gorunmez', async () => {
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]), recordTypeUret: () => 'None' });

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '70', '5');

  await screen.findByText(tamMetin('70 kg × 5'));
  expect(screen.queryByText(/rekoru/)).not.toBeInTheDocument();
});

test('agirlik 0 ile set eklenebilir', async () => {
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '0', '12');

  expect(await screen.findByText(tamMetin('0 kg × 12'))).toBeInTheDocument();
});

test('agirlik alani bos birakilirsa istek gonderilmez ve alan hatasi gosterilir', async () => {
  let istekYapildiMi = false;
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
  server.use(
    http.post('/api/sets', () => {
      istekYapildiMi = true;
      return HttpResponse.json({
        id: 1,
        sessionId: 1,
        exerciseId: 1,
        exerciseName: 'Bench Press',
        weight: 0,
        reps: 8,
        recordType: 'None',
        rir: null,
        createdAt: new Date().toISOString(),
      });
    }),
  );

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await paneliAc(kullanici);
  // Agirlik alani BILEREK bos birakiliyor -- "0" (barfiks/dips) gecerli bir deger olsa da,
  // hic girilmemis bir alan "0" degil "girilmedi" demektir (review bulgusu).
  await kullanici.clear(screen.getByLabelText('Ağırlık (kg)'));
  await kullanici.clear(screen.getByLabelText('Tekrar'));
  await kullanici.type(screen.getByLabelText('Tekrar'), '8');
  await kullanici.click(screen.getByRole('button', { name: 'Set ekle' }));

  const hatalar = await screen.findAllByRole('alert');
  expect(hatalar.length).toBeGreaterThan(0);
  expect(istekYapildiMi).toBe(false);
});

test('sunucu 400 alan hatasini PascalCase Weight ile donerse agirlik alaninin altinda gosterilir', async () => {
  // Anahtar karsilastirmasi case-insensitive olmali: backend ValidationProblemDetails.Errors
  // CLR property adini ("Weight") tasir, form kucuk harfli "weight" id'si kullanir (I3).
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
  server.use(
    http.post('/api/sets', () =>
      HttpResponse.json(
        {
          title: 'Geçersiz istek',
          status: 400,
          errors: { Weight: ['Ağırlık 0 ile 500 arasında olmalı.'] },
        },
        { status: 400 },
      ),
    ),
  );

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '600', '8');

  const agirlikAlani = screen.getByLabelText('Ağırlık (kg)');
  expect(agirlikAlani.closest('div')).toHaveTextContent('Ağırlık 0 ile 500 arasında olmalı.');
});

test('sunucu 400 alan hatasi hicbir render edilen alanla eslesmezse genel uyari gosterilir', async () => {
  // ASP.NET deserializasyon hatasi $.reps gibi anahtarlar donebilir -- bunlar formun render
  // ettigi hicbir alanla eslesmez, sessiz kalinmamali (I3).
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
  server.use(
    http.post('/api/sets', () =>
      HttpResponse.json(
        {
          title: 'Geçersiz istek gövdesi',
          detail: 'İstek gövdesi ayrıştırılamadı.',
          status: 400,
          errors: { '$.reps': ['The JSON value could not be converted.'] },
        },
        { status: 400 },
      ),
    ),
  );

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '60', '8');

  expect(await screen.findByRole('alert')).toHaveTextContent('İstek gövdesi ayrıştırılamadı.');
});

test('tekrar ondalikli (8.5) girilirse istemcide reddedilir, istek gonderilmez', async () => {
  let istekYapildiMi = false;
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
  server.use(
    http.post('/api/sets', () => {
      istekYapildiMi = true;
      return HttpResponse.json({
        id: 1,
        sessionId: 1,
        exerciseId: 1,
        exerciseName: 'Bench Press',
        weight: 60,
        reps: 8,
        recordType: 'None',
        rir: null,
        createdAt: new Date().toISOString(),
      });
    }),
  );

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '60', '8.5');

  expect(await screen.findByRole('alert')).toHaveTextContent('Tekrar sayısı tam sayı olmalı.');
  expect(istekYapildiMi).toBe(false);
});

/** #266: RIR kaydiricinin ara duragi ("2–3") sunucuya 2.5 olarak gider ve set satirinda aralik yazar. */
test('RIR kaydiricisindan secilen ara durak POST govdesinde 2.5 gider ve satirda 2–3 yazar', async () => {
  const ortam = sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await paneliAc(kullanici);
  await kullanici.click(screen.getByRole('button', { name: 'RIR (opsiyonel): girilmedi' }));
  await kullanici.click(screen.getByRole('button', { name: '2–3' }));
  await setEkle(kullanici, '60', '8');

  expect(await screen.findByText('RIR 2–3')).toBeInTheDocument();
  expect(ortam.sonGonderilenGovde()).toMatchObject({ weight: 60, reps: 8, rir: 2.5 });
});

test('acik oturum sorgusu 500 donerse hata gosterilir, bos durum metni GORUNMEZ', async () => {
  sahteSunucuyuKur();
  server.use(
    http.get('/api/sessions/open', () =>
      HttpResponse.json({ title: 'Sunucu hatası', status: 500 }, { status: 500 }),
    ),
  );

  antrenmanSayfasiniOlustur();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Oturum bilgisi alınamadı. Lütfen sayfayı yenileyin.',
  );
  // KRITIK: bir sunucu hatasi, antrenman yokken gorunen ekranla (#87'den beri Takvim + Sablonla basla)
  // KARISTIRILMAMALI -- aksi halde kullanici gercekte var olabilecek bir oturumu goremeden yeni bir
  // antrenman baslatmaya kalkisir (review bulgusu).
  expect(screen.queryByRole('heading', { name: 'Şablonla başla' })).not.toBeInTheDocument();
});

test('setler sorgusu 500 donerse hata gosterilir, "henuz set eklenmedi" bos durum metni GORUNMEZ', async () => {
  // I4: setler var olabilir ama cekilemiyor olabilir -- bunu "henuz set eklenmedi" ile
  // karistirmak, kullaniciyi gercekte var olan setleri goremeden yeniden girmeye ya da yanlis
  // bir bos durumu gercek sanmaya iter (Task 4'teki acik oturum hatasiyla AYNI desen).
  const acikOturum: SessionResponse = {
    id: 5,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: null,
    templateName: null,
    notes: null,
    progress: [],
  };
  sahteSunucuyuKur({ baslangicOturumu: acikOturum });
  server.use(
    http.get('/api/sessions/:id/sets', () =>
      HttpResponse.json({ title: 'Sunucu hatası', status: 500 }, { status: 500 }),
    ),
  );

  antrenmanSayfasiniOlustur();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Setler alınamadı. Lütfen sayfayı yenileyin.',
  );
  expect(screen.queryByText('Bugün henüz set eklenmedi.')).not.toBeInTheDocument();
});

/**
 * #182 (#153'un web yarisi): "Antrenmani bitir" oturumu burada KAPATMAZ, zorluk kadraninin oldugu
 * bitirme sayfasina goturur. Kadran, "Atla" ve "Devam et" AntrenmanBitirPage.test.tsx'te.
 */
test('Antrenmani bitir oturumu kapatmadan bitirme sayfasina gider', async () => {
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
  // Set GIRILMIS oturum: "bitir" yalnizca bu durumda cikar (#47).
  const ortam = sahteSunucuyuKur({ baslangicOturumu: acikOturum, baslangicSetleri: [girilmisSet(7)] });

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Antrenmanı bitir' }));

  expect(await screen.findByText('bitirme sayfasi')).toBeInTheDocument();
  expect(ortam.bitirmeGovdeleri()).toEqual([]);
});

test('setsiz acik oturumda bitir yerine iptal cikar ve DELETE ile bos duruma donulur', async () => {
  const acikOturum: SessionResponse = {
    id: 7,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: 10,
    templateName: 'Push Day',
    notes: null,
    progress: [],
  };
  const ortam = sahteSunucuyuKur({ baslangicOturumu: acikOturum, sablonlar: [PUSH_DAY] });

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  const iptal = await screen.findByRole('button', { name: 'Antrenmanı iptal et' });
  // Issue #47: setsiz oturumda "bitir" GORUNMEZ -- gecmise bos bir antrenman birakan yol budur.
  expect(screen.queryByRole('button', { name: 'Antrenmanı bitir' })).not.toBeInTheDocument();

  await kullanici.click(iptal);

  expect(await screen.findByRole('heading', { name: 'Şablonla başla' })).toBeInTheDocument();
  expect(ortam.silinenOturumlar()).toEqual([7]);
});

test('set girilince iptal dugmesi yerini bitir dugmesine birakir', async () => {
  // #62: set, antrenmandaki bir hareketin kartindan girilir; setsiz sablonlu oturum.
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  expect(await screen.findByRole('button', { name: 'Antrenmanı iptal et' })).toBeInTheDocument();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '60', '8');

  // Artik silinecek gercek veri var: iptal kaybolur, yerine bitir gelir.
  expect(await screen.findByRole('button', { name: 'Antrenmanı bitir' })).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Antrenmanı iptal et' })).not.toBeInTheDocument(),
  );
});

test('iptal basarisiz olursa hata gosterilir ve dugme yerinde kalir', async () => {
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
  server.use(
    http.delete('/api/sessions/:id', () =>
      HttpResponse.json({ title: 'Sunucu hatası', status: 500 }, { status: 500 }),
    ),
  );

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: 'Antrenmanı iptal et' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Antrenman iptal edilemedi. Lütfen tekrar deneyin.',
  );
  expect(screen.getByRole('button', { name: 'Antrenmanı iptal et' })).toBeInTheDocument();
});

test('sunucu 400 donerse detay gosterilir ve form icerigi kaybolmaz', async () => {
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
  server.use(
    http.post('/api/sets', () =>
      HttpResponse.json(
        { title: 'Geçersiz istek', detail: 'Bu egzersiz artık kullanılamıyor.', status: 400 },
        { status: 400 },
      ),
    ),
  );

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '60', '8');

  expect(await screen.findByRole('alert')).toHaveTextContent('Bu egzersiz artık kullanılamıyor.');
  expect(screen.getByLabelText('Ağırlık (kg)')).toHaveValue('60');
  expect(screen.getByLabelText('Tekrar')).toHaveValue('8');
});

test('ag hatasi: set kaydedilmemis OLABILECEGINI soyleyen mesaj gosterilir ve form icerigi kaybolmaz', async () => {
  // R15: mesaj artik "kaydedilmedi" diye KESIN bir iddiada bulunmuyor -- istemci fetch
  // reddettiginde istegin sunucuya ulasip ulasmadigini bilemez; yanlis "kaydedilmedi" iddiasi
  // kullaniciyi tekrar denemeye ve YINELENEN bir set olusturmaya iter.
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
  server.use(http.post('/api/sets', () => HttpResponse.error()));

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '60', '8');

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Sunucuya ulaşılamadı. Set kaydedilmemiş olabilir; tekrar denemeden önce listeyi kontrol edin.',
  );
  // Form icerigi KORUNUR -- kullanici hatayi degerlendirip tekrar deneyebilsin (spec Karar 8).
  expect(screen.getByLabelText('Ağırlık (kg)')).toHaveValue('60');
  expect(screen.getByLabelText('Tekrar')).toHaveValue('8');
});

test('ag hatasi sonrasi acik oturum ve setler invalidate edilir (baglanti geri gelince gercek durum gorunsun)', async () => {
  const acikOturum = sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]);
  sahteSunucuyuKur({ baslangicOturumu: acikOturum });
  let acikOturumIstekSayisi = 0;
  server.use(
    http.get('/api/sessions/open', () => {
      acikOturumIstekSayisi += 1;
      return HttpResponse.json(acikOturum);
    }),
    http.post('/api/sets', () => HttpResponse.error()),
  );

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  const ilkIstekSayisi = acikOturumIstekSayisi;
  await setEkle(kullanici, '60', '8');

  await screen.findByRole('alert');
  // Ag hatasi sonrasi acik oturum sorgusu invalidate edilip YENIDEN cekilir -- baglanti geri
  // gelince ekran bayat kalmaz (review bulgusu R15).
  await waitFor(() => expect(acikOturumIstekSayisi).toBeGreaterThan(ilkIstekSayisi));
});

test('set eklenince durum satiri eklenen seti duyurur', async () => {
  // Spec davranis 5: sabit panel listeyi kismen ortebilir; eklenen set hem gorunur hem ekran
  // okuyucuya (role=status, polite) duyurulur. Dugmenin adi DEGISMEZ.
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });

  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '82,5', '5');

  expect(await screen.findByText('Eklendi: 82,5 kg × 5')).toHaveAttribute('role', 'status');
  expect(screen.getByRole('button', { name: 'Set ekle' })).toBeInTheDocument();
});

test('bos durumda sablon kartina dokunmak templateId ile oturum baslatir ve hareket kartlari gorunur', async () => {
  const ortam = sahteSunucuyuKur({ sablonlar: [PUSH_DAY] });
  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  const kart = await screen.findByRole('button', { name: /Push Day/ });
  expect(kart).toHaveTextContent('2 hareket');
  await kullanici.click(kart);

  expect(await screen.findByRole('button', { name: 'Bench Press, 0 / 4 set' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Squat, 0 / 3 set' })).toBeInTheDocument();
  expect(ortam.baslatmaGovdeleri()).toEqual([{ templateId: 10 }]);
  // Baslikta sablon adi notr hap olarak (buyuk harf CSS ile).
  expect(screen.getByText('Push Day')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Şablonla başla' })).not.toBeInTheDocument();
});

test('baslatma var olan sablonsuz oturumu donerse sablon uygulanmadi bilgisi gorunur', async () => {
  sahteSunucuyuKur({ sablonlar: [PUSH_DAY] });
  // Arada baska bir yerden oturum acilmis: sunucu 200 ile sablonsuz oturumu doner.
  let acik: SessionResponse | null = null;
  server.use(
    http.get('/api/sessions/open', () =>
      acik ? HttpResponse.json(acik) : HttpResponse.json({ title: 'Not Found', status: 404 }, { status: 404 }),
    ),
    http.post('/api/sessions', () => {
      acik = {
        id: 30,
        startedAt: new Date().toISOString(),
        endedAt: null,
        isOpen: true,
        templateId: null,
        templateName: null,
        notes: null,
        progress: [],
      };
      return HttpResponse.json(acik, { status: 200 });
    }),
  );
  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await kullanici.click(await screen.findByRole('button', { name: /Push Day/ }));

  expect(
    await screen.findByText('Bugün zaten açık bir antrenmanın var; şablon uygulanmadı.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: HAREKET_KARTI_ADI })).not.toBeInTheDocument();
});

test('hic sablon yokken bos durumda metin ici baglanti YOKTUR (issue #61 Karar 2)', async () => {
  // Ayni is artik alt alandaki "+ Sablon oluştur" dugmesinde -- iki kez durmaz.
  sahteSunucuyuKur({ sablonlar: [] });
  antrenmanSayfasiniOlustur();

  expect(await screen.findByText('Henüz şablon yok.')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Şablon oluştur/ })).not.toBeInTheDocument();
});

test('sablon varken de metin ici baglanti yoktur, Şablonları yönet baglantisi kalir', async () => {
  sahteSunucuyuKur({ sablonlar: [PUSH_DAY] });
  antrenmanSayfasiniOlustur();

  await screen.findByRole('button', { name: /Push Day/ });
  expect(screen.queryByRole('link', { name: /Şablon oluştur/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Şablonları yönet' })).toHaveAttribute('href', '/templates');
});

test('bos durumda alt alandaki Sablon oluştur dugmesi /templates/new\'e donus state\'iyle gider', async () => {
  // Issue #61 Karar 3: BURADAN olusturulan sablon kaydedilince Bugun'e donsun diye state tasinir.
  sahteSunucuyuKur();
  const kullanici = userEvent.setup();

  render(
    <QueryClientProvider client={testeOzelSorguIstemcisi()}>
      <AuthProvider>
        <PageTitleProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<AntrenmanPage />} />
              <Route path="/antrenman/bitir" element={<p>bitirme sayfasi</p>} />
              <Route path="/templates/new" element={<AlinanRota />} />
            </Routes>
          </MemoryRouter>
        </PageTitleProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );

  await kullanici.click(await screen.findByRole('button', { name: 'Şablon oluştur' }));

  // #272: kaydedince ana sayfa yerine sablon kartlarinin oldugu bu ekrana donulur.
  expect(await screen.findByText('donus=/antrenman')).toBeInTheDocument();
});

test('sablonlu oturumda kartlar sunucunun sirasiyla gorunur; varsayilan secim tamamlanmamis ilk harekettir', async () => {
  sahteSunucuyuKur({
    baslangicOturumu: sablonluOturum([ilerleme(2, 'Squat', 3, 3), ilerleme(1, 'Bench Press', 4, 1)]),
  });
  antrenmanSayfasiniOlustur();

  await waitFor(() => expect(screen.getAllByRole('button', { name: HAREKET_KARTI_ADI })).toHaveLength(2));
  const kartlar = screen.getAllByRole('button', { name: HAREKET_KARTI_ADI });
  expect(kartlar[0]).toHaveAccessibleName('Squat, 3 / 3 set');
  expect(kartlar[1]).toHaveAccessibleName('Bench Press, 1 / 4 set');
  expect(kartlar[0]).toHaveAttribute('aria-pressed', 'false');
  expect(kartlar[1]).toHaveAttribute('aria-pressed', 'true');
});

test('sablonun ilk tamamlanmamis hareketi arsivlenmisse (GET /api/exercises listede yok) varsayilan secim bir sonraki gecerli harekettir', async () => {
  // F1 (review bulgusu): progress arsivlenmis bir hareketi (id 3) icerebilir ama GET /api/exercises
  // onu dondurmez -- varsayilan secim boyle bir id'ye SAPLANIRSA, AddSetForm'daki kontrollu
  // <select>de karsilik gelen bir <option> olmaz ve secim gecersiz kalir.
  sahteSunucuyuKur({
    baslangicOturumu: sablonluOturum([
      ilerleme(3, 'Eski Hareket', 2, 0),
      ilerleme(1, 'Bench Press', 4, 1),
    ]),
  });
  antrenmanSayfasiniOlustur();

  await waitFor(() => expect(screen.getAllByRole('button', { name: HAREKET_KARTI_ADI })).toHaveLength(2));
  await seciliKartaBekle('Bench Press');
});

test('karta dokunmak paneldeki hareketi degistirir; hareket tamamlaninca secim sonrakine atlamaz', async () => {
  sahteSunucuyuKur({
    baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 1, 0), ilerleme(2, 'Squat', 3, 0)]),
  });
  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '60', '8');

  const bench = await screen.findByRole('button', { name: 'Bench Press, 1 / 1 set' });
  expect(bench).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Yeni set: Bench Press' })).toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Squat, 0 / 3 set' }));

  expect(screen.getByRole('heading', { name: 'Yeni set: Squat' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Squat, 0 / 3 set' })).toHaveAttribute('aria-pressed', 'true');
});

test('yeni sablonlu oturum gorununce secim o oturumun varsayilanina doner', async () => {
  // I1: onceki oturumdan kalma bir secim (Bench Press) yeni sablonda hic olmayabilir -- bitirip
  // FARKLI bir sablonla (Leg Day) baslatinca secim o oturumun kendi varsayilanina (Squat) donmeli.
  sahteSunucuyuKur({ sablonlar: [PUSH_DAY] });
  let acik: SessionResponse | null = sablonluOturum([
    ilerleme(1, 'Bench Press', 4, 0),
    ilerleme(2, 'Squat', 3, 0),
  ]);
  const LEG_DAY: TemplateResponse = {
    id: 11,
    name: 'Leg Day',
    createdAt: '2026-09-02T08:00:00Z',
    exercises: [
      { id: 3, exerciseId: 2, exerciseName: 'Squat', category: 'Legs', isArchived: false, orderIndex: 0, plannedSets: 3, restSeconds: 90 },
    ],
  };
  server.use(
    http.get('/api/sessions/open', () =>
      acik ? HttpResponse.json(acik) : HttpResponse.json({ title: 'Not Found', status: 404 }, { status: 404 }),
    ),
    http.get('/api/templates', () => HttpResponse.json([PUSH_DAY, LEG_DAY])),
    // Onceki oturumda set YOK: onu temizlemenin yolu "Antrenmani iptal et"tir (#47).
    http.delete('/api/sessions/:id', () => {
      acik = null;
      return new HttpResponse(null, { status: 204 });
    }),
    http.post('/api/sessions', async ({ request }) => {
      const govde = (await request.json()) as { templateId?: number | null };
      acik = {
        id: 40,
        startedAt: new Date().toISOString(),
        endedAt: null,
        isOpen: true,
        templateId: govde.templateId ?? null,
        templateName: 'Leg Day',
        notes: null,
        progress: [ilerleme(2, 'Squat', 3, 0)],
      };
      return HttpResponse.json(acik, { status: 201 });
    }),
  );
  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  // Ilk sablonlu oturumun varsayilani: tamamlanmamis ilk hareket, Bench Press.
  await seciliKartaBekle('Bench Press');

  await kullanici.click(await screen.findByRole('button', { name: 'Antrenmanı iptal et' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Antrenmanı iptal et' })).not.toBeInTheDocument(),
  );

  await kullanici.click(await screen.findByRole('button', { name: /Leg Day/ }));

  expect(await screen.findByRole('button', { name: 'Squat, 0 / 3 set' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('secili kartta gecmis acilinca istenir ve set eklenince yeniden istenir', async () => {
  const ortam = sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  // #50: grafik kapali baslar; acilmadan ilerleme istegi atilmaz.
  expect(ortam.ilerlemeAramalari()).toHaveLength(0);
  await kullanici.click(await screen.findByText('Geçmiş'));
  await waitFor(() => expect(ortam.ilerlemeAramalari().length).toBeGreaterThan(0));
  expect(ortam.ilerlemeAramalari()[0]).toBe('/api/stats/exercises/1/progress');
  const ilkSayi = ortam.ilerlemeAramalari().length;

  await setEkle(kullanici, '60', '8');

  await waitFor(() => expect(ortam.ilerlemeAramalari().length).toBeGreaterThan(ilkSayi));
});

test('set paneli kapali baslar; karta dokunmak acar, Paneli kapat kapatir, yazilan deger korunur ve odak geri doner', async () => {
  // Issue #61 ile bos-durumdaki "Set ekle" acma dugmesi kalkti; acik antrenmanda panel karta
  // dokunarak acilir (#62). Odagin kapaninca DOGRU acma dugmesine ("Hareket ekle") donmesi hic
  // sinanmamisti -- I2 bulgusunun "acilista TASINMAZ" tarafi ayri testte, "kapaninca doner" tarafi
  // burada.
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  expect(screen.getByLabelText('Ağırlık (kg)')).not.toBeVisible();
  expect(screen.queryByRole('button', { name: 'Paneli kapat' })).not.toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Bench Press, 0 / 4 set' }));

  expect(screen.getByLabelText('Ağırlık (kg)')).toBeVisible();
  await kullanici.type(screen.getByLabelText('Ağırlık (kg)'), '60');

  await kullanici.click(screen.getByRole('button', { name: 'Paneli kapat' }));

  expect(screen.getByLabelText('Ağırlık (kg)')).not.toBeVisible();
  // #226: odak paneli acan karta doner -- "Hareket ekle" artik listenin sonunda, oraya donmek sayfayi
  // en alta atlatirdi.
  expect(screen.getByRole('button', { name: 'Bench Press, 0 / 4 set' })).toHaveFocus();

  await kullanici.click(screen.getByRole('button', { name: 'Bench Press, 0 / 4 set' }));
  expect(screen.getByLabelText('Ağırlık (kg)')).toHaveValue('60');
});

test('hareket kartina dokunmak hareketi secer ve set panelini acar, grafigi acmaz', async () => {
  const ortam = sahteSunucuyuKur({
    baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0), ilerleme(2, 'Squat', 3, 0)]),
  });
  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  expect(screen.getByLabelText('Ağırlık (kg)')).not.toBeVisible();

  await kullanici.click(await screen.findByRole('button', { name: 'Squat, 0 / 3 set' }));

  expect(screen.getByLabelText('Ağırlık (kg)')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Yeni set: Squat' })).toBeInTheDocument();
  // I2 (review bulgusu): karta dokunarak acilan panelde odak agirlik alanina TASINMAZ -- aksi
  // halde telefon klavyesi acilir ve kartin az once ortaya cikardigi grafigi ortar.
  expect(screen.getByLabelText('Ağırlık (kg)')).not.toHaveFocus();
  // #50: secim ve grafik ayri eylemler -- secili kartin gecmisi kapali kalir, istek atilmaz.
  expect(screen.getByText('Geçmiş').closest('details')).not.toHaveAttribute('open');
  expect(ortam.ilerlemeAramalari()).toHaveLength(0);
});

test('set eklendikten sonra panel acik kalir', async () => {
  sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
  const kullanici = userEvent.setup();
  antrenmanSayfasiniOlustur();

  await seciliKartaBekle('Bench Press');
  await setEkle(kullanici, '60', '8');

  expect(await screen.findByText('Eklendi: 60 kg × 8')).toBeInTheDocument();
  expect(screen.getByLabelText('Ağırlık (kg)')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Paneli kapat' })).toBeInTheDocument();
});

describe('set duzenleme ve silme (#57)', () => {
  /** Tek seti (Bench Press 60 kg × 8, id 500) olan sablonsuz acik oturum. */
  function setliOturumuKur() {
    const acikOturum: SessionResponse = {
      id: 40,
      startedAt: new Date().toISOString(),
      endedAt: null,
      isOpen: true,
      templateId: null,
      templateName: null,
      notes: null,
      progress: [],
    };
    return sahteSunucuyuKur({ baslangicOturumu: acikOturum, baslangicSetleri: [girilmisSet(40)] });
  }

  const SET_SATIRI = '1. set, 60 kg × 8, düzenle';

  test('set satirina dokununca duzenleyici acilir; kaydedince liste sunucudan tazelenip yeni degeri gosterir', async () => {
    setliOturumuKur();
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await kullanici.click(await screen.findByRole('button', { name: SET_SATIRI }));
    const form = screen.getByRole('form', { name: '1. seti düzenle' });
    const tekrar = within(form).getByLabelText('Tekrar');
    await kullanici.clear(tekrar);
    await kullanici.type(tekrar, '10');
    await kullanici.click(within(form).getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByRole('button', { name: '1. set, 60 kg × 10, düzenle' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: '1. seti düzenle' })).not.toBeInTheDocument();
  });

  test('Seti sil: satir hemen kalkar ve geri al seridi cikar; geri alinca satir doner, DELETE hic gitmez', async () => {
    const ortam = setliOturumuKur();
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await kullanici.click(await screen.findByRole('button', { name: SET_SATIRI }));
    await kullanici.click(screen.getByRole('button', { name: 'Seti sil' }));

    expect(await screen.findByText('Set silindi')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: SET_SATIRI })).not.toBeInTheDocument();
    // API silinen seti ayni zaman damgasi ve rekor sirasiyla geri getiremez: tek durust geri alma,
    // silmeyi henuz YAPMAMIS olmaktir (#46 ile ayni gerekce).
    expect(ortam.silinenSetler()).toEqual([]);

    await kullanici.click(screen.getByRole('button', { name: 'Geri al' }));

    expect(await screen.findByRole('button', { name: SET_SATIRI })).toBeInTheDocument();
    expect(ortam.silinenSetler()).toEqual([]);
  });

  test('geri alma suresi dolunca DELETE gider; oturumun son seti silindiyse "Antrenmanı iptal et" doner', async () => {
    // Yalnizca seridin saati (Date + setInterval) sahtelenir; MSW ve userEvent gercek setTimeout ile
    // calismaya devam eder. Serit araligini monte olurken kurdugu icin sahte saat RENDER'DAN ONCE kurulur.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval'] });
    try {
      const ortam = setliOturumuKur();
      const kullanici = userEvent.setup();
      antrenmanSayfasiniOlustur();

      await kullanici.click(await screen.findByRole('button', { name: SET_SATIRI }));
      await kullanici.click(screen.getByRole('button', { name: 'Seti sil' }));
      await screen.findByText('Set silindi');

      act(() => {
        vi.advanceTimersByTime(5100);
      });
      // Pencere kapandi, silme basladi. Gerisi (DELETE ve tazeleme) gercek zamanla ve act ile sarili
      // bekleyicilerle izlenir; aksi halde tazelemenin guncellemesi act disinda kalir.
      vi.useRealTimers();

      await waitFor(() => expect(ortam.silinenSetler()).toEqual([500]));
      expect(await screen.findByRole('button', { name: 'Antrenmanı iptal et' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('antrenman hareketleri (#60, #62)', () => {
  test('hedefsiz hareket karti "2 set" gosterir; Plan disi bolumu yoktur', async () => {
    sahteSunucuyuKur({
      baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0), ilerleme(2, 'Squat', null, 2)]),
    });
    antrenmanSayfasiniOlustur();

    expect(await screen.findByRole('button', { name: 'Squat, 2 set' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bench Press, 0 / 4 set' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Plan dışı' })).not.toBeInTheDocument();
  });

  test('acik antrenmanda panelde hareket secimi yoktur; set dokunulan kartin hareketine gider', async () => {
    const ortam = sahteSunucuyuKur({
      baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0), ilerleme(2, 'Squat', 3, 0)]),
    });
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await kullanici.click(await screen.findByRole('button', { name: 'Squat, 0 / 3 set' }));

    expect(screen.getByRole('heading', { name: 'Yeni set: Squat' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Egzersiz')).not.toBeInTheDocument();

    await setEkle(kullanici, '70', '5');

    await waitFor(() => expect(ortam.sonGonderilenGovde()).toMatchObject({ exerciseId: 2, weight: 70, reps: 5 }));
  });

  test('Hareket ekle secicisi yalnizca antrenmanda olmayan hareketleri listeler; secince eklenir ve kart secili gelir', async () => {
    const ortam = sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await kullanici.click(await screen.findByRole('button', { name: 'Hareket ekle' }));

    // Yalnizca hareketler: agirlik/tekrar alani yok, antrenmanda olan Bench Press listede yok.
    const liste = await screen.findByRole('listbox', { name: 'Hareketler' });
    expect(within(liste).getAllByRole('option').map((secenek) => secenek.textContent)).toEqual(['Squat']);
    expect(screen.queryByLabelText('Ağırlık (kg)')).not.toBeVisible();

    await kullanici.click(within(liste).getByRole('option', { name: 'Squat' }));

    await waitFor(() => expect(ortam.eklenenHareketler()).toEqual([2]));
    expect(await screen.findByRole('button', { name: 'Squat, 0 set' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('Hareket ekle alta yapisik panelde degil, hareket kartlarindan sonra akisin icinde durur (#226)', async () => {
    sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
    antrenmanSayfasiniOlustur();

    const dugme = await screen.findByRole('button', { name: 'Hareket ekle' });
    const kart = screen.getByRole('button', { name: 'Bench Press, 0 / 4 set' });

    expect(kart.compareDocumentPosition(dugme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(dugme.closest('.sticky')).toBeNull();
  });

  test('Hareketi kaldir: kart hemen gizlenir ve geri al seridi cikar; geri alinca kart doner, DELETE gitmez', async () => {
    const ortam = sahteSunucuyuKur({
      baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0), ilerleme(2, 'Squat', 3, 0)]),
    });
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await kullanici.click(await screen.findByRole('button', { name: 'Squat, 0 / 3 set' }));
    await kullanici.click(screen.getByRole('button', { name: 'Hareketi kaldır' }));

    expect(await screen.findByText('Hareket kaldırıldı')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Squat, 0 / 3 set' })).not.toBeInTheDocument();
    expect(ortam.kaldirilanHareketler()).toEqual([]);

    await kullanici.click(screen.getByRole('button', { name: 'Geri al' }));

    expect(await screen.findByRole('button', { name: 'Squat, 0 / 3 set' })).toBeInTheDocument();
    expect(ortam.kaldirilanHareketler()).toEqual([]);
  });

  test('geri alma suresi dolunca hareketi kaldirma istegi gider', async () => {
    // #57 ile ayni: yalnizca seridin saati sahtelenir, render'dan once kurulur.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval'] });
    try {
      const ortam = sahteSunucuyuKur({
        baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0), ilerleme(2, 'Squat', 3, 0)]),
      });
      const kullanici = userEvent.setup();
      antrenmanSayfasiniOlustur();

      await kullanici.click(await screen.findByRole('button', { name: 'Squat, 0 / 3 set' }));
      await kullanici.click(screen.getByRole('button', { name: 'Hareketi kaldır' }));
      await screen.findByText('Hareket kaldırıldı');

      act(() => {
        vi.advanceTimersByTime(5100);
      });
      vi.useRealTimers();

      await waitFor(() => expect(ortam.kaldirilanHareketler()).toEqual([2]));
      expect(screen.getByRole('button', { name: 'Bench Press, 0 / 4 set' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('dinlenme sayaci', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-13T10:00:00Z'));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('sablondaki harekete set eklenince sayac hareketin restSeconds degeriyle baslar', async () => {
    sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0, 120)]) });
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await seciliKartaBekle('Bench Press');
    await setEkle(kullanici, '60', '8');

    expect(await screen.findByText('2:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+15 sn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atla' })).toBeInTheDocument();
  });

  test('restSeconds 0 olan harekette sayac baslamaz', async () => {
    sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0, 0)]) });
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await seciliKartaBekle('Bench Press');
    await setEkle(kullanici, '60', '8');

    expect(await screen.findByText('Eklendi: 60 kg × 8')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Atla' })).not.toBeInTheDocument();
  });

  test('sablonsuz antrenmanda sayac varsayilan 90 sn ile baslar', async () => {
    // Sablonsuz (templateId null) acik oturum, plan disi eklenen bir hareket icin restSeconds
    // gelmez -- #62'nin "Hareket ekle" akisiyla eklenen Bench Press bu yuzden varsayilani (90) alir.
    const acikSablonsuzOturum: SessionResponse = {
      id: 40,
      startedAt: new Date().toISOString(),
      endedAt: null,
      isOpen: true,
      templateId: null,
      templateName: null,
      notes: null,
      progress: [],
    };
    const ortam = sahteSunucuyuKur({ baslangicOturumu: acikSablonsuzOturum });
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await kullanici.click(await screen.findByRole('button', { name: 'Hareket ekle' }));
    const liste = await screen.findByRole('listbox', { name: 'Hareketler' });
    await kullanici.click(within(liste).getByRole('option', { name: 'Bench Press' }));
    await waitFor(() => expect(ortam.eklenenHareketler()).toEqual([1]));

    await setEkle(kullanici, '60', '8');

    expect(await screen.findByText('1:30')).toBeInTheDocument();
  });

  test('dinlenme sayaci panel kapaliyken de gorunur', async () => {
    sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0)]) });
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await seciliKartaBekle('Bench Press');
    await setEkle(kullanici, '60', '8');
    expect(await screen.findByText('1:30')).toBeInTheDocument();

    await kullanici.click(screen.getByRole('button', { name: 'Paneli kapat' }));

    expect(screen.getByText('1:30')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Atla' })).toBeInTheDocument();
  });

  test('sayfa degisip geri donulunce dinlenme sayaci kaldigi yerden devam eder', async () => {
    // Issue #190: bilesen unmount/remount olunca (sekme degisimi, sayfa yenileme) sayac
    // kaybolmamali -- kalici depoya (localStorage) yazilan mutlak bitis zamanindan dogru kalan
    // sure kendiliginden cikmali.
    sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0, 120)]) });
    const kullanici = userEvent.setup();
    const client = testeOzelSorguIstemcisi();
    const { unmount } = antrenmanSayfasiniOlustur(client);

    await seciliKartaBekle('Bench Press');
    await setEkle(kullanici, '60', '8');
    expect(await screen.findByText('2:00')).toBeInTheDocument();

    unmount();
    vi.setSystemTime(new Date('2026-09-13T10:00:30Z')); // 30 saniye gecti

    antrenmanSayfasiniOlustur(client);

    await seciliKartaBekle('Bench Press');
    expect(await screen.findByText('1:30')).toBeInTheDocument();
  });
});

describe('sablonsuz antrenman ve sablon olarak kaydetme (#186, #209)', () => {
  /** #186: "Sablonla basla" birincil yol olarak kalir; bos antrenman ikincil bir secenektir. */
  test('antrenman yokken Bos antrenman baslat sablonsuz oturum acar', async () => {
    const ortam = sahteSunucuyuKur({ sablonlar: [PUSH_DAY] });
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await kullanici.click(await screen.findByRole('button', { name: 'Boş antrenman başlat' }));

    await waitFor(() => expect(ortam.baslatmaGovdeleri()).toEqual([{ templateId: null }]));
    expect(await screen.findByRole('button', { name: 'Hareket ekle' })).toBeInTheDocument();
  });

  /** #209: set girilmemis olsa da listedeki hareketler, sirasiyla, sablon formuna tasinir. */
  test('Sablon olarak kaydet antrenmanin hareketleriyle sablon formuna gider', async () => {
    sahteSunucuyuKur({
      baslangicOturumu: sablonluOturum([ilerleme(2, 'Squat', 5, 0, 180), ilerleme(1, 'Bench Press', null, 0)]),
    });
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await kullanici.click(await screen.findByRole('button', { name: 'Şablon olarak kaydet' }));

    expect(await screen.findByText('donus=/antrenman')).toBeInTheDocument();
    expect(
      screen.getByText(
        `hareketler=${JSON.stringify([
          { exerciseId: 2, exerciseName: 'Squat', plannedSets: 5, restSeconds: 180 },
          { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 3, restSeconds: 90 },
        ])}`,
      ),
    ).toBeInTheDocument();
  });

  test('hareketi olmayan antrenmanda Sablon olarak kaydet gorunmez', async () => {
    sahteSunucuyuKur({ baslangicOturumu: sablonluOturum([]) });
    antrenmanSayfasiniOlustur();

    expect(await screen.findByText('Devam ediyor')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Şablon olarak kaydet' })).not.toBeInTheDocument();
  });

  /**
   * #229: secili kartin ok dugmeleri sirayi degistirir. Kartlar sunucu yanitini beklemeden yeni sirayla
   * gorunur, PUT govdesi antrenmandaki TUM hareketlerin yeni sirasidir.
   */
  test('secili kartta yukari tasi kartlari yeni sirayla gosterir ve PUT ile tam listeyi gonderir', async () => {
    const ortam = sahteSunucuyuKur({
      baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0), ilerleme(2, 'Squat', 3, 0)]),
    });
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await kullanici.click(await screen.findByRole('button', { name: 'Squat, 0 / 3 set' }));
    await kullanici.click(screen.getByRole('button', { name: 'Squat: yukarı taşı' }));

    const kartlar = screen.getAllByRole('button', { name: HAREKET_KARTI_ADI });
    expect(kartlar.map((kart) => kart.getAttribute('aria-label'))).toEqual(['Squat, 0 / 3 set', 'Bench Press, 0 / 4 set']);
    await waitFor(() => expect(ortam.siraGovdeleri()).toEqual([{ exerciseIds: [2, 1] }]));
  });

  test('sira kaydedilemezse kartlar eski sirasina doner ve uyari gorunur', async () => {
    sahteSunucuyuKur({
      baslangicOturumu: sablonluOturum([ilerleme(1, 'Bench Press', 4, 0), ilerleme(2, 'Squat', 3, 0)]),
      siraHatasi: true,
    });
    const kullanici = userEvent.setup();
    antrenmanSayfasiniOlustur();

    await kullanici.click(await screen.findByRole('button', { name: 'Squat, 0 / 3 set' }));
    await kullanici.click(screen.getByRole('button', { name: 'Squat: yukarı taşı' }));

    expect(await screen.findByText('Hareketlerin sırası kaydedilemedi.')).toBeInTheDocument();
    const kartlar = screen.getAllByRole('button', { name: HAREKET_KARTI_ADI });
    expect(kartlar.map((kart) => kart.getAttribute('aria-label'))).toEqual(['Bench Press, 0 / 4 set', 'Squat, 0 / 3 set']);
  });
});
