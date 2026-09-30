import { render, screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { useCalendar, useGunGecmisi } from '@grind/shared/api/queries';
import { Text } from 'react-native';
import { TakvimDonemiProvider, useTakvimDonemi } from '../ui/TakvimDonemiContext';
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

/**
 * #420: takvimin donemi artik bilesenin kendi durumu DEGIL, paylasilan kaynaktan gelir
 * (`TakvimDonemiProvider`) -- arkadas karsilastirmasi da ayni donemi okur.
 */
async function cizTakvim(ek?: React.ReactNode) {
  await render(
    <TakvimDonemiProvider bugun={BUGUN}>
      <Takvim />
      {ek}
    </TakvimDonemiProvider>,
  );
}

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
  await cizTakvim();

  expect(sonAralik()).toBe('2026-09-14..2026-09-20');
  expect(screen.queryByRole('button', { name: 'Önceki' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Sonraki' })).toBeNull();
  expect(screen.queryByText('Aylık')).toBeNull();
  expect(screen.queryByText('Haftalık')).toBeNull();
});

test('takvim ikonu aylik ve haftalik arasinda gecis yapar', async () => {
  await cizTakvim();

  await fireEvent.press(screen.getByLabelText('Aylık görünüme geç'));

  await waitFor(() => expect(sonAralik()).toBe('2026-09-01..2026-09-30'));
  expect(screen.getByText('Eylül 2026')).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Haftalık görünüme geç'));

  await waitFor(() => expect(sonAralik()).toBe('2026-09-14..2026-09-20'));
});

/** #324: gun hucresi kucuk bir isaret tasir -- antrenmanli gunde onay, antrenmansizda bos halka. */
test('antrenman yapilan gunde onay isareti, yapilmayan gunde bos halka vardir', async () => {
  useCalendarMock.mockReturnValue(ozet([{ date: '2026-09-14', sessionCount: 1, setCount: 18, volume: 4200 }]));
  await cizTakvim();

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
  await cizTakvim();

  await fireEvent.press(screen.getByLabelText('14 Eylül: 18 set'));

  expect(mockPush).toHaveBeenCalledWith('/gun/2026-09-14');
});

/** #324: bugun hafif gri bir zeminle vurgulanir; diger gunler zeminsizdir. */
test('bugunun hucresi gri zeminle vurgulanir, diger gunler degil', async () => {
  await cizTakvim();

  const bugunHucresi = screen.getByLabelText('15 Eylül: antrenman yok');
  const digerHucre = screen.getByLabelText('14 Eylül: antrenman yok');

  expect(JSON.stringify(bugunHucresi.props.className)).toContain('bg-surface-2');
  expect(JSON.stringify(digerHucre.props.className)).not.toContain('bg-surface-2');
});

/** #324: "Hedef serisi" yerine bu haftanin ilerlemesi -- x (bu hafta antrenman gunu) / hedef. */
test('haftalik hedef karti bu haftanin ilerlemesini x/hedef olarak gosterir', async () => {
  useCalendarMock.mockReturnValue(ozet([], { thisWeekTrainedDays: 2, weeklyTargetDays: 4, currentTargetStreak: 7 }));
  await cizTakvim();

  expect(screen.getByText('Haftalık hedef')).toBeTruthy();
  expect(screen.getByLabelText('Bu hafta 2 gün, hedef 4')).toBeTruthy();
  expect(screen.queryByText('Hedef serisi')).toBeNull();
});

/** #324: hedef yokken kart kaybolmaz, hedef belirlemeye cagirir -- hedef ekranina ana sayfadan ulasilsin. */
test('haftalik hedef yoksa kart hedef belirlemeye cagirir', async () => {
  await cizTakvim();

  expect(screen.getByText('Haftalık hedef')).toBeTruthy();
  expect(screen.getByText('Hedef belirle')).toBeTruthy();
});

test('haftalik hedef kartina dokununca hedef ekranina gidilir', async () => {
  useCalendarMock.mockReturnValue(ozet([], { thisWeekTrainedDays: 2, weeklyTargetDays: 4 }));
  await cizTakvim();

  await fireEvent.press(screen.getByText('Haftalık hedef'));

  expect(mockPush).toHaveBeenCalledWith('/haftalik-hedef');
});

/** #324: seri karti buyuk sayi + ates ikonu; altinda en uzun seri ("Rekorun"). */
test('haftalik seri karti seriyi ve en uzun seriyi gosterir', async () => {
  useCalendarMock.mockReturnValue(ozet([], { currentWeekStreak: 3, longestWeekStreak: 8 }));
  await cizTakvim();

  expect(screen.getByText('Haftalık seri')).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByText('Rekorun: 8 hafta')).toBeTruthy();
});

// ---- Ozet kartlarinin dikey cubugu (#544) ----

/**
 * #544 (kullanici karari): iki ozet karti Apple Saglik'in olcum kartlari gibi -- solda ikonlu etiket,
 * deger ve durum satiri, sagda dikey bir cubuk. Seri cubugu mevcut seriyi SIMDIYE KADARKI EN UZUN
 * seriyle karsilastirir; cubugun degeri erisilebilirlik agacinda da okunur (min/max/now).
 */
test('seri cubugu mevcut seriyi en uzun seriyle karsilastirir', async () => {
  useCalendarMock.mockReturnValue(ozet([], { currentWeekStreak: 3, longestWeekStreak: 8 }));
  await cizTakvim();

  expect(screen.getByTestId('seri-cubugu').props.accessibilityValue).toEqual({ min: 0, max: 8, now: 3 });
});

test('hedef cubugu bu haftaki gunu haftalik hedefle karsilastirir', async () => {
  useCalendarMock.mockReturnValue(ozet([], { thisWeekTrainedDays: 2, weeklyTargetDays: 4 }));
  await cizTakvim();

  expect(screen.getByTestId('hedef-cubugu').props.accessibilityValue).toEqual({ min: 0, max: 4, now: 2 });
});

/**
 * Hedef yokken karsilastirilacak bir sey yok: cubugun kanali durur (iki kart ayni bicimde kalsin)
 * ama dolmaz.
 */
test('hedef yokken hedef cubugu dolmaz', async () => {
  await cizTakvim();

  expect(screen.getByTestId('hedef-cubugu')).toBeTruthy();
  expect(screen.queryByTestId('hedef-cubugu-dolu')).toBeNull();
});

/** Gorseldeki durum satirinin hedef kartindaki karsiligi: kalan gun ya da hedefin tamamlandigi. */
test('hedef kartinin durum satiri kalan gunu ya da tamamlandigini soyler', async () => {
  useCalendarMock.mockReturnValue(ozet([], { thisWeekTrainedDays: 2, weeklyTargetDays: 4 }));
  const { rerender } = await render(
    <TakvimDonemiProvider bugun={BUGUN}>
      <Takvim />
    </TakvimDonemiProvider>,
  );
  expect(screen.getByText('2 gün kaldı')).toBeTruthy();

  useCalendarMock.mockReturnValue(ozet([], { thisWeekTrainedDays: 4, weeklyTargetDays: 4 }));
  await rerender(
    <TakvimDonemiProvider bugun={BUGUN}>
      <Takvim />
    </TakvimDonemiProvider>,
  );
  expect(screen.getByText('Hedef tamam')).toBeTruthy();
});

/**
 * #547 (kullanici karari): kullanici rekorunu her hafta tazeliyorsa (mevcut seri = en uzun seri) seri
 * cubugunun altinda alev cizilir. Rekorun gerisindeyken yok; hedef kartinda hic yok.
 */
/** Kullanici karari: rekordayken alev, cubugun tepesindeki HALKANIN YERINI alir. */
test('seri rekordayken halkanin yerinde alev durur', async () => {
  useCalendarMock.mockReturnValue(ozet([], { currentWeekStreak: 4, longestWeekStreak: 4 }));
  await cizTakvim();

  expect(screen.getByTestId('seri-cubugu-alev')).toBeTruthy();
  expect(screen.queryByTestId('seri-cubugu-halka')).toBeNull();
});

/** Alev haftalik hedeften BAGIMSIZ (kullanici karari): hedef tutulmamisken de cizilir, yalniz seri kartinda. */
test('alev haftalik hedeften bagimsizdir ve yalnizca seri kartindadir', async () => {
  useCalendarMock.mockReturnValue(
    ozet([], { currentWeekStreak: 4, longestWeekStreak: 4, thisWeekTrainedDays: 0, weeklyTargetDays: 4 }),
  );
  await cizTakvim();

  expect(screen.getAllByTestId('seri-cubugu-alev')).toHaveLength(1);
  expect(screen.queryByTestId('hedef-cubugu-alev')).toBeNull();
});

test('seri rekorun gerisindeyken alev yok, halka durur', async () => {
  useCalendarMock.mockReturnValue(ozet([], { currentWeekStreak: 2, longestWeekStreak: 5 }));
  await cizTakvim();

  expect(screen.queryByTestId('seri-cubugu-alev')).toBeNull();
  expect(screen.getByTestId('seri-cubugu-halka')).toBeTruthy();
});

/** Paylasilan donemi ekrana yazan sonda: takvimin YAZDIGINI baska bir tuketici goruyor mu? */
function DonemSondasi() {
  const { gorunum, gosterilen } = useTakvimDonemi();
  return <Text testID="donem-sondasi">{`${gorunum}:${gosterilen}`}</Text>;
}

/**
 * #420'nin yapisal cekirdegi: takvimin donemi TEK kaynaktandir. Takvimde gorunum degisince ayni
 * saglayiciyi okuyan baska bir bilesen (ana sayfadaki arkadas karsilastirmasi) degisikligi gorur --
 * iki ayri donem durumu olsaydi takvim ile liste birbirinden ayrisirdi.
 */
test('takvimin donemi paylasilan kaynaga yazilir', async () => {
  await cizTakvim(<DonemSondasi />);
  expect(screen.getByTestId('donem-sondasi')).toHaveTextContent(`hafta:${BUGUN}`);

  await fireEvent.press(screen.getByLabelText('Aylık görünüme geç'));

  expect(screen.getByTestId('donem-sondasi')).toHaveTextContent(`ay:${BUGUN}`);
});
