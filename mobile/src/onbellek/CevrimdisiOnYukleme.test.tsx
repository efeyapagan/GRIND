import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import { trBugundenOnce } from '@grind/shared/lib/format';
import { onbelleklenecekTakvimAraliklari } from '@grind/shared/lib/takvim';
import { BaglantiBaglami } from '../baglanti/BaglantiSaglayici';
import CevrimdisiOnYukleme from './CevrimdisiOnYukleme';

jest.mock('@grind/shared/api/client', () => ({ request: jest.fn() }));
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ username: 'ada' }) }));
const requestMock = request as jest.Mock;

const BOS_TAKVIM = {
  days: [], trainedDayCount: 0, currentWeekStreak: 0, longestWeekStreak: 0, thisWeekTrainedDays: 0,
  weeklyTargetDays: null, currentTargetStreak: null,
};

beforeEach(() =>
  requestMock.mockReset().mockImplementation(async (yol: string) => (yol.startsWith('/stats/calendar') ? BOS_TAKVIM : [])),
);

function ciz(cevrimdisi: boolean) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BaglantiBaglami.Provider value={cevrimdisi}>
        <CevrimdisiOnYukleme />
      </BaglantiBaglami.Provider>
    </QueryClientProvider>,
  );
}

/** #174 (kullanici karari): bu ayin ve onceki ayin araliklari cevrimiciyken onceden cekilir (kalici onbellege girer). */
test('cevrimiciyken bu ay ve onceki ayin takvim araliklari onceden cekilir', async () => {
  await ciz(false);

  const beklenen = onbelleklenecekTakvimAraliklari(trBugundenOnce(0)).map(
    ({ from, to }) => `/stats/calendar?From=${from}&To=${to}`,
  );
  await waitFor(() =>
    expect(requestMock.mock.calls.map(([yol]) => yol).filter((yol) => yol.startsWith('/stats')).sort()).toEqual(
      [...beklenen].sort(),
    ),
  );
});

/** #174 dilim 3: sablon ve hareket listesi de onden cekilir -- salonda ilk kez sablon olusturan hareket secebilsin. */
test('cevrimiciyken sablonlar ve hareket listesi onceden cekilir', async () => {
  await ciz(false);

  await waitFor(() => expect(requestMock.mock.calls.map(([yol]) => yol)).toEqual(expect.arrayContaining(['/templates', '/exercises'])));
});

test('cevrimdisiyken hicbir sey cekilmez', async () => {
  await ciz(true);

  expect(requestMock).not.toHaveBeenCalled();
});
