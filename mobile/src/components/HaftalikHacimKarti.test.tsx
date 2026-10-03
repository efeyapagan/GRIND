import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import type { HaftalikIstatistik } from '@grind/shared/api/queries';
import HaftalikHacimKarti from './HaftalikHacimKarti';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

function hafta(weekStart: string, volume: number): HaftalikIstatistik {
  return { weekStart, volume, pushSets: 0, pullSets: 0, legsSets: 0, otherSets: 0 };
}

const BENCH = { id: 1, name: 'Bench Press', category: 'Push', measurement: 'WeightReps', isArchived: false, isGlobal: true, media: [] };
const CRUNCH = { id: 160, name: 'Crunch', category: 'Other', measurement: 'Reps', isArchived: false, isGlobal: true, media: [] };

/** Toplam: son tamamlanmis hafta 5.000, fark +1.000. Bench Press: 700, fark +400. */
const TOPLAM = [hafta('2026-02-23', 4000), hafta('2026-03-02', 5000), hafta('2026-03-09', 50)];
const BENCH_HAFTALARI = [hafta('2026-02-23', 300), hafta('2026-03-02', 700), hafta('2026-03-09', 0)];

function kur(haftalar: HaftalikIstatistik[] = TOPLAM) {
  requestMock.mockImplementation(async (path: string) => {
    if (path === '/exercises') return [BENCH, CRUNCH];
    if (path === '/stats/weekly?exerciseId=1') return { weeks: BENCH_HAFTALARI };
    throw new Error(`beklenmeyen istek ${path}`);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <HaftalikHacimKarti haftalar={haftalar} />
    </QueryClientProvider>,
  );
}

async function hareketSec(ad: string) {
  await fireEvent.press(await screen.findByRole('button', { name: /^Hareketi değiştir: / }));
  await fireEvent.press(await screen.findByRole('button', { name: ad }));
}

/** Devam eden hafta (son satir, 50 kg) "Su anki" olmaz: son tamamlanmis hafta (5.000) olur. */
test('su anki hacim son tamamlanmis haftadir', async () => {
  await kur();

  expect(screen.getByText('5.000')).toBeTruthy();
  expect(screen.getByText('+1.000')).toBeTruthy();
});

test('tamamlanmis hafta yoksa grafik yerine aciklama', async () => {
  await kur([hafta('2026-03-09', 50)]);

  expect(screen.getByText('İlk haftan bitince haftalık hacmin burada görünür.')).toBeTruthy();
});

/** #586: acilista toplam hacim; bir hareket secilince grafik o hareketin haftalik hacmine gecer. */
test('hareket secilince o hareketin haftalik hacmi gorunur', async () => {
  await kur();

  await hareketSec('Bench Press');

  expect(await screen.findByText('700')).toBeTruthy();
  expect(screen.getByText('+400')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Hareketi değiştir: Bench Press' })).toBeTruthy();
});

/** #586: listenin basindaki "Tüm hareketler" toplam hacme geri dondurur. */
test('tum hareketler secilince toplam hacme doner', async () => {
  await kur();
  await hareketSec('Bench Press');
  await screen.findByText('700');

  await hareketSec('Tüm hareketler');

  expect(await screen.findByText('5.000')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Hareketi değiştir: Tüm hareketler' })).toBeTruthy();
});

/** #586: tekrarli/sureli hareketin hacmi 0'dir -- secicide yalnizca kilolu hareketler listelenir. */
test('secici yalnizca kilolu hareketleri listeler', async () => {
  await kur();

  await fireEvent.press(await screen.findByRole('button', { name: 'Hareketi değiştir: Tüm hareketler' }));

  expect(await screen.findByRole('button', { name: 'Bench Press' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Crunch' })).toBeNull();
});
