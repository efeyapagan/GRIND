import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import { trBugundenOnce } from '@grind/shared/lib/format';
import { onbelleklenecekTakvimAraliklari } from '@grind/shared/lib/takvim';
import { BaglantiBaglami } from '../baglanti/BaglantiSaglayici';
import TakvimOnYuklemesi from './TakvimOnYuklemesi';

jest.mock('@grind/shared/api/client', () => ({ request: jest.fn() }));
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ username: 'ada' }) }));
const requestMock = request as jest.Mock;

const BOS_TAKVIM = {
  days: [], trainedDayCount: 0, currentWeekStreak: 0, longestWeekStreak: 0, thisWeekTrainedDays: 0,
  weeklyTargetDays: null, currentTargetStreak: null,
};

beforeEach(() => requestMock.mockReset().mockResolvedValue(BOS_TAKVIM));

function ciz(cevrimdisi: boolean) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BaglantiBaglami.Provider value={cevrimdisi}>
        <TakvimOnYuklemesi />
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
  await waitFor(() => expect(requestMock.mock.calls.map(([yol]) => yol).sort()).toEqual([...beklenen].sort()));
});

test('cevrimdisiyken hicbir sey cekilmez', async () => {
  await ciz(true);

  expect(requestMock).not.toHaveBeenCalled();
});
