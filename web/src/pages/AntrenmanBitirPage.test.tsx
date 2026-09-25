import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import { AuthProvider } from '../auth/AuthContext';
import { session } from '../auth/session';
import AntrenmanBitirPage from './AntrenmanBitirPage';
import { PageTitleProvider } from '../ui/PageTitleContext';
import type { components } from '../api/schema';

type SessionResponse = components['schemas']['SessionResponse'];
type TemplateResponse = components['schemas']['TemplateResponse'];

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
function sahteSunucuyuKur(
  opsiyonlar: { oturum?: SessionResponse | null; bitirmeHatasi?: boolean; sablon?: TemplateResponse } = {},
) {
  let oturum = opsiyonlar.oturum === undefined ? ACIK_OTURUM : opsiyonlar.oturum;
  const bitirmeGovdeleri: unknown[] = [];
  server.use(
    // Oturumun sablonu: "liste sablondan sapti mi?" karsilastirmasi buradan okunur.
    http.get('/api/templates/:id', () =>
      opsiyonlar.sablon
        ? HttpResponse.json(opsiyonlar.sablon)
        : HttpResponse.json({ title: 'Not Found', status: 404 }, { status: 404 }),
    ),
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
      // Gercek backend gibi: bitmis antrenman artik "acik oturum" degildir.
      const bitmis = { ...oturum!, isOpen: false, endedAt: new Date().toISOString() };
      oturum = null;
      return HttpResponse.json(bitmis);
    }),
  );
  return { bitirmeGovdeleri: () => bitirmeGovdeleri };
}

/** #186: sablon formunun aldigi state'i ekrana yazar -- gercek SablonDuzenlePage yerine sahte hedef. */
function SablonFormuRotasi() {
  const state = useLocation().state as { donus?: string; hareketler?: unknown } | null;
  return <p>{`sablon formu donus=${state?.donus} hareketler=${JSON.stringify(state?.hareketler)}`}</p>;
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
              <Route path="/templates/new" element={<SablonFormuRotasi />} />
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

describe('bitirince sablon olarak kaydetme sorusu (#186)', () => {
  const SABLONSUZ_HAREKETLI: SessionResponse = {
    ...ACIK_OTURUM,
    progress: [
      { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: null, completedSets: 3, restSeconds: 90 },
      { exerciseId: 2, exerciseName: 'Squat', plannedSets: null, completedSets: 2, restSeconds: 120 },
    ],
  };

  /** Soru antrenman KAPANDIKTAN sonra gelir: acik oturum artik yok ama sayfa antrenman sayfasina kacmaz. */
  test('sablonsuz ve hareketli antrenman bitince sablon sorusu cikar', async () => {
    const ortam = sahteSunucuyuKur({ oturum: SABLONSUZ_HAREKETLI });
    sayfayiOlustur();

    await userEvent.click(await screen.findByRole('button', { name: 'Antrenmanı bitir' }));

    expect(await screen.findByText('Şablon olarak kaydedilsin mi?')).toBeInTheDocument();
    expect(ortam.bitirmeGovdeleri()).toEqual([{ difficulty: 'Medium' }]);
    expect(screen.queryByText('antrenman sayfasi')).not.toBeInTheDocument();
  });

  test('sorudaki Sablon olarak kaydet antrenmanin hareketleriyle sablon formuna gider', async () => {
    sahteSunucuyuKur({ oturum: SABLONSUZ_HAREKETLI });
    sayfayiOlustur();

    await userEvent.click(await screen.findByRole('button', { name: 'Atla' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Şablon olarak kaydet' }));

    expect(
      await screen.findByText(
        `sablon formu donus=/ hareketler=${JSON.stringify([
          { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 3, restSeconds: 90 },
          { exerciseId: 2, exerciseName: 'Squat', plannedSets: 3, restSeconds: 120 },
        ])}`,
      ),
    ).toBeInTheDocument();
  });

  test('sorudaki Simdi degil ana sayfaya doner', async () => {
    sahteSunucuyuKur({ oturum: SABLONSUZ_HAREKETLI });
    sayfayiOlustur();

    await userEvent.click(await screen.findByRole('button', { name: 'Antrenmanı bitir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Şimdi değil' }));

    expect(await screen.findByText('ana sayfa')).toBeInTheDocument();
  });

  /** Sablon satiri: karsilastirma yalnizca `exerciseId`ye bakar, digerleri sunucu bicimi icin. */
  function sablonHareketi(exerciseId: number, exerciseName: string) {
    return { id: exerciseId, exerciseId, exerciseName, isArchived: false, orderIndex: 0, plannedSets: 3, restSeconds: 90 };
  }

  const SABLONLU_OTURUM: SessionResponse = { ...SABLONSUZ_HAREKETLI, templateId: 10, templateName: 'Push Day' };

  /** Liste sablonun aynisi: yeni bir sablon adayi yok, soru sorulmaz. */
  test('sablonundan sapmamis antrenman bitince soru sorulmaz, ana sayfaya donulur', async () => {
    sahteSunucuyuKur({
      oturum: SABLONLU_OTURUM,
      sablon: {
        id: 10,
        name: 'Push Day',
        exercises: [sablonHareketi(1, 'Bench Press'), sablonHareketi(2, 'Squat')],
      },
    });
    sayfayiOlustur();

    await userEvent.click(await screen.findByRole('button', { name: 'Antrenmanı bitir' }));

    expect(await screen.findByText('ana sayfa')).toBeInTheDocument();
    expect(screen.queryByText('Şablon olarak kaydedilsin mi?')).not.toBeInTheDocument();
  });

  /** Sablonda olmayan bir hareket eklendiyse liste artik yeni bir sablon adayidir. */
  test('sablonunda olmayan hareket eklenmis antrenman bitince soru cikar', async () => {
    sahteSunucuyuKur({
      oturum: SABLONLU_OTURUM,
      sablon: { id: 10, name: 'Push Day', exercises: [sablonHareketi(1, 'Bench Press')] },
    });
    sayfayiOlustur();

    await userEvent.click(await screen.findByRole('button', { name: 'Antrenmanı bitir' }));

    expect(await screen.findByText('Şablon olarak kaydedilsin mi?')).toBeInTheDocument();
    // Aciklama sablonsuz halinkinden farkli: neden soruldugunu anlatir.
    expect(
      screen.getByText('Şablonunda olmayan hareketler eklemişsin. Bu listeyi yeni bir şablon olarak kaydedebilirsin.'),
    ).toBeInTheDocument();
  });

  test('sapan antrenmanda Sablon olarak kaydet TUM hareketlerle yeni sablon formuna gider', async () => {
    sahteSunucuyuKur({
      oturum: SABLONLU_OTURUM,
      sablon: { id: 10, name: 'Push Day', exercises: [sablonHareketi(1, 'Bench Press')] },
    });
    sayfayiOlustur();

    await userEvent.click(await screen.findByRole('button', { name: 'Antrenmanı bitir' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Şablon olarak kaydet' }));

    expect(
      await screen.findByText(
        `sablon formu donus=/ hareketler=${JSON.stringify([
          { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 3, restSeconds: 90 },
          { exerciseId: 2, exerciseName: 'Squat', plannedSets: 3, restSeconds: 120 },
        ])}`,
      ),
    ).toBeInTheDocument();
  });

  /** Sablon alinamazsa bitirme BEKLETILMEZ: soru sorulmadan ana sayfaya donulur. */
  test('sablon sorgusu basarisizsa soru sorulmaz', async () => {
    sahteSunucuyuKur({ oturum: SABLONLU_OTURUM });
    sayfayiOlustur();

    await userEvent.click(await screen.findByRole('button', { name: 'Antrenmanı bitir' }));

    expect(await screen.findByText('ana sayfa')).toBeInTheDocument();
  });
});
