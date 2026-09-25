import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import HareketGecmisi from './HareketGecmisi';
import type { components } from '../api/schema';

type ExerciseProgressPointResponse = components['schemas']['ExerciseProgressPointResponse'];
type Kullanici = ReturnType<typeof userEvent.setup>;

function gecmisiOlustur() {
  const istemci = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={istemci}>
      <HareketGecmisi exerciseId={1} exerciseName="Bench Press" />
    </QueryClientProvider>,
  );
}

/** Grafik varsayilan olarak kapalidir (#50); testler once "Geçmiş" basligina dokunur. */
async function grafigiAc(kullanici: Kullanici) {
  await kullanici.click(screen.getByText('Geçmiş'));
}

function nokta(
  sessionId: number,
  startedAt: string,
  topWeight: number,
  volume: number,
  estimatedOneRepMax: number | null,
  position = 1,
  positionChanged = false,
): ExerciseProgressPointResponse {
  return {
    sessionId,
    startedAt,
    date: startedAt.slice(0, 10),
    topWeight,
    topWeightReps: 5,
    volume,
    setCount: 3,
    estimatedOneRepMax,
    position,
    positionChanged,
  };
}

// Sunucu sirasi: eskiden yeniye.
const NOKTALAR = [
  nokta(3, '2026-08-25T08:00:00Z', 60, 900, 67.5),
  nokta(5, '2026-09-01T08:00:00Z', 62.5, 1000, null),
  nokta(9, '2026-09-10T08:00:00Z', 57.5, 1100, 64.69),
];

function sunucuyuKur(points: ExerciseProgressPointResponse[]) {
  const aramalar: URL[] = [];
  server.use(
    http.get('/api/stats/exercises/:id/progress', ({ request, params }) => {
      aramalar.push(new URL(request.url));
      return HttpResponse.json({ exerciseId: Number(params.id), exerciseName: 'Bench Press', points });
    }),
  );
  return aramalar;
}

function maddeler() {
  return screen.getAllByRole('listitem').map((madde) => madde.textContent);
}

// Yalnizca Date sahtelenir: "1 Ay" araliginin baslangic gunu sabit olsun; MSW ve userEvent gercek
// zamanlayicilarla calismaya devam eder.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-14T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

test('kapali baslar ve istek atmaz; basliga dokununca acilip ister, tekrar dokununca kapanir', async () => {
  const aramalar = sunucuyuKur(NOKTALAR);
  const kullanici = userEvent.setup();
  gecmisiOlustur();

  const baslik = screen.getByText('Geçmiş');
  expect(baslik.closest('details')).not.toHaveAttribute('open');
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '1 Ay' })).not.toBeInTheDocument();
  expect(aramalar).toHaveLength(0);

  await grafigiAc(kullanici);

  expect(await screen.findByRole('img', { name: 'Bench Press ağırlık, 3 antrenman' })).toBeInTheDocument();
  expect(baslik.closest('details')).toHaveAttribute('open');
  expect(aramalar).toHaveLength(1);

  await kullanici.click(baslik);

  expect(baslik.closest('details')).not.toHaveAttribute('open');
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
});

test('varsayilan Agirlik sekmesi ve 1 Ay: From ile ister, en agir setleri cizer, Su anki ve Fark gosterir', async () => {
  const aramalar = sunucuyuKur(NOKTALAR);
  const kullanici = userEvent.setup();
  gecmisiOlustur();
  await grafigiAc(kullanici);

  expect(await screen.findByRole('img', { name: 'Bench Press ağırlık, 3 antrenman' })).toBeInTheDocument();
  expect(aramalar[0].pathname).toBe('/api/stats/exercises/1/progress');
  expect(aramalar[0].searchParams.get('From')).toBe('2026-08-15');
  expect(screen.getByRole('tab', { name: 'Ağırlık' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('button', { name: '1 Ay' })).toHaveAttribute('aria-pressed', 'true');
  expect(maddeler()).toEqual([
    '25 Ağu: 60 kg (1. hareket)',
    '1 Eyl: 62,5 kg (1. hareket)',
    '10 Eyl: 57,5 kg (1. hareket)',
  ]);
  expect(screen.getByText('Şu anki').parentElement).toHaveTextContent('57,5');
  expect(screen.getByText('Fark').parentElement).toHaveTextContent('−2,5');
  expect(screen.getByText('25 Ağu – 10 Eyl 2026')).toBeInTheDocument();
});

test('Antrenman ve Tahmini 1RM sekmeleri sunucu degerlerine gecer; 1RM olmayan nokta cizilmez', async () => {
  sunucuyuKur(NOKTALAR);
  const kullanici = userEvent.setup();
  gecmisiOlustur();
  await grafigiAc(kullanici);

  await screen.findByRole('img', { name: 'Bench Press ağırlık, 3 antrenman' });
  await kullanici.click(screen.getByRole('tab', { name: 'Antrenman' }));

  expect(maddeler()).toEqual([
    '25 Ağu: 900 kg (1. hareket)',
    '1 Eyl: 1.000 kg (1. hareket)',
    '10 Eyl: 1.100 kg (1. hareket)',
  ]);
  expect(screen.getByText('Fark').parentElement).toHaveTextContent('+200');

  await kullanici.click(screen.getByRole('tab', { name: 'Tahmini 1RM' }));

  expect(screen.getByRole('img', { name: 'Bench Press tahmini 1RM, 2 antrenman' })).toBeInTheDocument();
  expect(maddeler()).toEqual(['25 Ağu: 67,5 kg (1. hareket)', '10 Eyl: 64,69 kg (1. hareket)']);
});

test('Tum araliginda From gonderilmez; bos sonucta aralik ve ilk antrenman metinleri', async () => {
  const aramalar = sunucuyuKur([]);
  const kullanici = userEvent.setup();
  gecmisiOlustur();
  await grafigiAc(kullanici);

  expect(await screen.findByText('Bu aralıkta kayıt yok')).toBeInTheDocument();

  await kullanici.click(screen.getByRole('button', { name: 'Tüm' }));

  expect(await screen.findByText('Bu hareketin ilk antrenmanı')).toBeInTheDocument();
  expect(aramalar.at(-1)?.searchParams.has('From')).toBe(false);
});

test('hicbir noktada tahmini 1RM yoksa aciklama metni gorunur', async () => {
  sunucuyuKur([nokta(3, '2026-09-10T08:00:00Z', 0, 0, null)]);
  const kullanici = userEvent.setup();
  gecmisiOlustur();
  await grafigiAc(kullanici);

  await screen.findByRole('img', { name: 'Bench Press ağırlık, 1 antrenman' });
  await kullanici.click(screen.getByRole('tab', { name: 'Tahmini 1RM' }));

  expect(screen.getByText('Tahmini 1RM için 1–12 tekrarlı ve ağırlıklı set gerekir.')).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

/**
 * Issue #230: her noktanin detayinda "N. hareket" gorunur; pozisyonu bir onceki noktadan farkli
 * olan nokta icin (yalnizca) ek bir aciklama satiri cikar.
 */
test('nokta pozisyonu detayda gorunur; pozisyon degisince aciklama satiri cikar', async () => {
  sunucuyuKur([
    nokta(3, '2026-08-25T08:00:00Z', 60, 900, 67.5, 1, false),
    nokta(5, '2026-09-01T08:00:00Z', 62.5, 1000, null, 2, true),
    nokta(9, '2026-09-10T08:00:00Z', 57.5, 1100, 64.69, 2, false),
  ]);
  const kullanici = userEvent.setup();
  gecmisiOlustur();
  await grafigiAc(kullanici);

  await screen.findByRole('img', { name: 'Bench Press ağırlık, 3 antrenman' });

  expect(maddeler()).toEqual([
    '25 Ağu: 60 kg (1. hareket)',
    '1 Eyl: 62,5 kg (2. hareket)',
    '10 Eyl: 57,5 kg (2. hareket)',
  ]);
  expect(
    screen.getByText(
      'Kesikli halkalı nokta: hareket o antrenmanda genelden farklı bir sırada yapıldı; değişim bundan kaynaklanıyor olabilir.',
    ),
  ).toBeInTheDocument();
});

test('hicbir noktanin pozisyonu degismemisse aciklama satiri cikmaz', async () => {
  sunucuyuKur(NOKTALAR);
  const kullanici = userEvent.setup();
  gecmisiOlustur();
  await grafigiAc(kullanici);

  await screen.findByRole('img', { name: 'Bench Press ağırlık, 3 antrenman' });

  expect(
    screen.queryByText(
      'Kesikli halkalı nokta: hareket o antrenmanda genelden farklı bir sırada yapıldı; değişim bundan kaynaklanıyor olabilir.',
    ),
  ).not.toBeInTheDocument();
});

test('istek basarisizsa hata duyurulur', async () => {
  server.use(
    http.get('/api/stats/exercises/:id/progress', () =>
      HttpResponse.json({ title: 'Sunucu hatası', status: 500 }, { status: 500 }),
    ),
  );
  const kullanici = userEvent.setup();
  gecmisiOlustur();
  await grafigiAc(kullanici);

  expect(await screen.findByRole('alert')).toHaveTextContent('Geçmiş alınamadı.');
});
