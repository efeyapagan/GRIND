import { renderHook } from '@testing-library/react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { dinlenmeBaslat, duraklat, sureEkle, type Dinlenme } from '@grind/shared/lib/dinlenme';
import DinlenmeAdasi from './DinlenmeAdasi';
import { useDinlenmeAdasi } from './useDinlenmeAdasi';

// #414: dinlenme sayaci Dynamic Island'a yansir. Adanin cizimi sistemde (widget) kosar; burada sabitlenen,
// sayacin hangi aninda adanin acildigi, guncellendigi ve kapandigidir.

const start = DinlenmeAdasi.start as jest.Mock;
const getInstances = DinlenmeAdasi.getInstances as jest.Mock;
const acikAda = { update: jest.fn(), end: jest.fn() };

const SIMDI = Date.UTC(2026, 9, 8, 10, 0, 0);
const SAYAC = dinlenmeBaslat(SIMDI, 90)!;

beforeEach(() => {
  jest.clearAllMocks();
  getInstances.mockReturnValue([]);
  (Constants as { executionEnvironment: string }).executionEnvironment = ExecutionEnvironment.Bare;
});

function kanca(dinlenme: Dinlenme | null, bitti = false) {
  return renderHook(({ d, b }: { d: Dinlenme | null; b: boolean }) => useDinlenmeAdasi(d, b), {
    initialProps: { d: dinlenme, b: bitti },
  });
}

/** Sayac baslayinca ada acilir; sureyi sistem akitir, bitis ani `staleDate` olarak verilir (bitince ikon kalir). */
test('sayac baslayinca ada baslangic ve bitis aniyla acilir', async () => {
  await kanca(SAYAC);

  expect(start).toHaveBeenCalledTimes(1);
  const [props, baglanti, staleDate] = start.mock.calls[0];
  expect(props).toMatchObject({
    baslangicMs: SIMDI, bitisMs: SIMDI + 90_000, etiket: 'Dinlenme', bittiEtiketi: 'Dinlenme bitti',
  });
  expect(baglanti).toBe('grind://antrenman');
  expect(staleDate).toEqual(new Date(SIMDI + 90_000));
});

/** +15 sn ikinci bir ada acmaz; acik olan yeni bitis aniyla guncellenir. */
test('sure uzatilinca acik ada guncellenir, yenisi acilmaz', async () => {
  getInstances.mockReturnValue([acikAda]);

  await kanca(sureEkle(SAYAC, 15));

  expect(start).not.toHaveBeenCalled();
  expect(acikAda.update).toHaveBeenCalledWith(
    expect.objectContaining({ bitisMs: SIMDI + 105_000 }), new Date(SIMDI + 105_000),
  );
});

test('sayac temizlenince ada kapanir', async () => {
  getInstances.mockReturnValue([acikAda]);

  await kanca(null);

  expect(acikAda.end).toHaveBeenCalledWith('immediate');
});

/** #477: duraklatilmis sayac hicbir yerde cizilmez -- adada da. */
test('sayac duraklatilinca ada kapanir', async () => {
  getInstances.mockReturnValue([acikAda]);

  await kanca(duraklat(SAYAC, SIMDI + 10_000));

  expect(acikAda.end).toHaveBeenCalledWith('immediate');
  expect(start).not.toHaveBeenCalled();
});

/** Kullanici karari: sure dolunca ada kapanmaz, saat ikonu kalir; sayac temizlenince kapanir. */
test('sure dolunca ada kapatilmaz', async () => {
  getInstances.mockReturnValue([acikAda]);

  await kanca(SAYAC, true);

  expect(acikAda.end).not.toHaveBeenCalled();
  expect(acikAda.update).not.toHaveBeenCalled();
});

/** `expo-widgets` Expo Go'da yok: ada sessizce devre disi kalir, sayac adasiz calisir. */
test("Expo Go'da adaya hic dokunulmaz", async () => {
  (Constants as { executionEnvironment: string }).executionEnvironment = ExecutionEnvironment.StoreClient;

  await kanca(SAYAC);

  expect(getInstances).not.toHaveBeenCalled();
  expect(start).not.toHaveBeenCalled();
});
