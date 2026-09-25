import { render, screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { useCalendar, useGunGecmisi } from '@grind/shared/api/queries';
import Takvim from './Takvim';

jest.mock('@grind/shared/api/queries', () => ({
  useCalendar: jest.fn(),
  useGunGecmisi: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const useCalendarMock = useCalendar as jest.Mock;
const useGunGecmisiMock = useGunGecmisi as jest.Mock;

const BUGUN = '2026-09-15';

type Gun = { date: string; sessionCount: number; setCount: number; volume: number };

/** Takvim ozeti; `alanlar` yalnizca testin konusu olan seri/hedef alanlarini ezer. */
function ozet(days: Gun[] = [], alanlar: Record<string, number | null> = {}) {
  return {
    data: {
      from: '',
      to: '',
      days,
      trainedDayCount: days.length,
      currentWeekStreak: 0,
      longestWeekStreak: 0,
      thisWeekTrainedDays: 0,
      weeklyTargetDays: null,
      currentTargetStreak: null,
      ...alanlar,
    },
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
  };
}

beforeEach(() => {
  mockPush.mockReset();
  useCalendarMock.mockReturnValue(ozet());
  useGunGecmisiMock.mockReturnValue({ data: undefined, isError: false });
});

/** Cagrilan aralik: `useCalendar(from, to)` -- gorunumun hangi donemi istedigini gosterir. */
function sonAralik(): string {
  const cagrilar = useCalendarMock.mock.calls;
  const son = cagrilar[cagrilar.length - 1];
  return `${son[0]}..${son[1]}`;
}

/**
 * #315: ana sayfa takvimi haftalik acilir, gorunum ikonla degisir, donem kaydirmayla. Kaydirmanin
 * KENDISI burada surulemez (gesture-handler jest'te guvenilir degil) -- kaydirma karari
 * `gezilebilirMi`/`kaydir` saf fonksiyonlarinda test edilir (web/src/lib/takvim.test.ts).
 */
test('uygulama haftalik acilir; gorunum sekmeleri ve ok dugmeleri yoktur', async () => {
  await render(<Takvim bugun={BUGUN} />);

  expect(sonAralik()).toBe('2026-09-14..2026-09-20');
  expect(screen.queryByRole('button', { name: 'Önceki' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Sonraki' })).toBeNull();
  expect(screen.queryByText('Aylık')).toBeNull();
  expect(screen.queryByText('Haftalık')).toBeNull();
});

test('takvim ikonu aylik ve haftalik arasinda gecis yapar', async () => {
  await render(<Takvim bugun={BUGUN} />);

  await fireEvent.press(screen.getByLabelText('Aylık görünüme geç'));

  await waitFor(() => expect(sonAralik()).toBe('2026-09-01..2026-09-30'));
  expect(screen.getByText('Eylül 2026')).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Haftalık görünüme geç'));

  await waitFor(() => expect(sonAralik()).toBe('2026-09-14..2026-09-20'));
});

/** #324: gun hucresi kucuk bir isaret tasir -- antrenmanli gunde onay, antrenmansizda bos halka. */
test('antrenman yapilan gunde onay isareti, yapilmayan gunde bos halka vardir', async () => {
  useCalendarMock.mockReturnValue(ozet([{ date: '2026-09-14', sessionCount: 1, setCount: 18, volume: 4200 }]));
  await render(<Takvim bugun={BUGUN} />);

  const antrenmanli = screen.getByLabelText('14 Eylül: 18 set');
  const bos = screen.getByLabelText('15 Eylül: antrenman yok');

  expect(within(antrenmanli).getByTestId('gun-isareti-antrenmanli')).toBeTruthy();
  expect(within(bos).getByTestId('gun-isareti-bos')).toBeTruthy();
});

/**
 * #261: gune dokunmak eskiden yerel bir secim state'i kuruyordu ve mobilde
 * "Couldn't find a navigation context" ile cokuyordu. Artik o gunun detay ekranina gidiyor.
 */
test('gune dokununca o gunun detay ekranina gidilir', async () => {
  useCalendarMock.mockReturnValue(ozet([{ date: '2026-09-14', sessionCount: 1, setCount: 18, volume: 4200 }]));
  await render(<Takvim bugun={BUGUN} />);

  await fireEvent.press(screen.getByLabelText('14 Eylül: 18 set'));

  expect(mockPush).toHaveBeenCalledWith('/gun/2026-09-14');
});

/** #324: bugun hafif gri bir zeminle vurgulanir; diger gunler zeminsizdir. */
test('bugunun hucresi gri zeminle vurgulanir, diger gunler degil', async () => {
  await render(<Takvim bugun={BUGUN} />);

  const bugunHucresi = screen.getByLabelText('15 Eylül: antrenman yok');
  const digerHucre = screen.getByLabelText('14 Eylül: antrenman yok');

  expect(JSON.stringify(bugunHucresi.props.className)).toContain('bg-surface-2');
  expect(JSON.stringify(digerHucre.props.className)).not.toContain('bg-surface-2');
});

/** #324: "Hedef serisi" yerine bu haftanin ilerlemesi -- x (bu hafta antrenman gunu) / hedef. */
test('haftalik hedef karti bu haftanin ilerlemesini x/hedef olarak gosterir', async () => {
  useCalendarMock.mockReturnValue(ozet([], { thisWeekTrainedDays: 2, weeklyTargetDays: 4, currentTargetStreak: 7 }));
  await render(<Takvim bugun={BUGUN} />);

  expect(screen.getByText('Haftalık hedef')).toBeTruthy();
  expect(screen.getByLabelText('Bu hafta 2 gün, hedef 4')).toBeTruthy();
  expect(screen.queryByText('Hedef serisi')).toBeNull();
});

test('haftalik hedef yoksa hedef karti cizilmez', async () => {
  await render(<Takvim bugun={BUGUN} />);

  expect(screen.queryByText('Haftalık hedef')).toBeNull();
});

/** #324: seri karti buyuk sayi + ates ikonu; altinda en uzun seri ("Rekorun"). */
test('haftalik seri karti seriyi ve en uzun seriyi gosterir', async () => {
  useCalendarMock.mockReturnValue(ozet([], { currentWeekStreak: 3, longestWeekStreak: 8 }));
  await render(<Takvim bugun={BUGUN} />);

  expect(screen.getByText('Haftalık seri')).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByText('Rekorun: 8 hafta')).toBeTruthy();
});
