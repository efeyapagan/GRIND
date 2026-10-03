import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import { ApiError } from '@grind/shared/api/problem';
import { queryKeys, type AcikOturum, type GecmisSayfasi, type SetKaydi } from '@grind/shared/api/queries';
import { BaglantiBaglami } from '../baglanti/BaglantiSaglayici';
import KuyrukSaglayici, { kuyrukAnahtari } from './KuyrukSaglayici';
import {
  useKuyrukluAddSet,
  useKuyrukluFinishSession,
  useKuyrukluStartSession,
} from './kuyrukluMutasyonlar';
import type { BekleyenIslem } from './kuyruk';

jest.mock('@grind/shared/api/client', () => ({ request: jest.fn() }));
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ username: 'ada' }) }));
const requestMock = request as jest.Mock;

const SABLON = {
  id: 7, name: 'Push Day', visibility: 'Friends', savedFromUsername: null, lastUsedAt: null, isPinned: false,
  exercises: [{ exerciseId: 1, exerciseName: 'Bench Press', category: 'Push', isArchived: false, plannedSets: 3, restSeconds: 90 }],
};

let queryClient: QueryClient;

beforeEach(async () => {
  await AsyncStorage.clear();
  requestMock.mockReset();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(queryKeys.templates, [SABLON]);
  queryClient.setQueryData(queryKeys.exercises, [{ id: 1, name: 'Bench Press', category: 'Push', measurement: 'WeightReps' }]);
  queryClient.setQueryData(queryKeys.openSession, null);
});

function sarmalayici(cevrimdisi: boolean) {
  return function Sarmalayici({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BaglantiBaglami.Provider value={cevrimdisi}>
          <KuyrukSaglayici>{children}</KuyrukSaglayici>
        </BaglantiBaglami.Provider>
      </QueryClientProvider>
    );
  };
}

async function diskKuyrugu(): Promise<BekleyenIslem[]> {
  return JSON.parse((await AsyncStorage.getItem(kuyrukAnahtari('ada'))) ?? '[]');
}

function kancalar() {
  return { baslat: useKuyrukluStartSession(), setEkle: useKuyrukluAddSet(), bitir: useKuyrukluFinishSession() };
}

/** #174 dilim 2: cevrimdisi baslatilan antrenman sablonun hareketleriyle hemen acilir, islem diske yazilir. */
test('cevrimdisi sablonla baslatma antrenmani hemen acar ve kuyruga yazar', async () => {
  const { result } = await renderHook(kancalar, { wrapper: sarmalayici(true) });
  await waitFor(async () => expect(await AsyncStorage.getItem(kuyrukAnahtari('ada'))).toBeNull());

  await act(async () => {
    await result.current.baslat.mutateAsync(7);
  });

  const oturum = queryClient.getQueryData<AcikOturum>(queryKeys.openSession)!;
  expect(oturum.id).toBeLessThan(0);
  expect(oturum.templateName).toBe('Push Day');
  expect(oturum.progress[0]).toMatchObject({ exerciseId: 1, plannedSets: 3, completedSets: 0 });
  expect((await diskKuyrugu()).map((islem) => islem.tur)).toEqual(['oturumBaslat']);
  expect(requestMock).not.toHaveBeenCalled();
});

/** Kullanici karari: set sayaci telefonda artar; set rozetsiz hemen gorunur. */
test('cevrimdisi set hemen gorunur, sayac artar, kuyruga cihaz zamaniyla yazilir', async () => {
  const { result } = await renderHook(kancalar, { wrapper: sarmalayici(true) });
  await act(async () => {
    await result.current.baslat.mutateAsync(7);
  });

  await act(async () => {
    await result.current.setEkle.mutateAsync({ exerciseId: 1, weight: 60, reps: 8, rir: null, durationSeconds: null });
  });

  const oturum = queryClient.getQueryData<AcikOturum>(queryKeys.openSession)!;
  const setler = queryClient.getQueryData<SetKaydi[]>(queryKeys.sessionSets(oturum.id))!;
  expect(setler).toHaveLength(1);
  expect(setler[0]).toMatchObject({ weight: 60, reps: 8, recordType: 'None', exerciseName: 'Bench Press' });
  expect(oturum.progress[0].completedSets).toBe(1);
  const kuyruk = await diskKuyrugu();
  expect(kuyruk.map((islem) => islem.tur)).toEqual(['oturumBaslat', 'setEkle']);
  expect(kuyruk[1]).toMatchObject({ oturumId: oturum.id, createdAt: expect.any(String) });
});

/** Cevrimici baslayip baglanti kopunca: istek ag hatasiyla duserse set kaybolmaz, kuyruga girer. */
test('cevrimiciyken ag hatasi alan set kuyruga girer', async () => {
  queryClient.setQueryData<AcikOturum>(queryKeys.openSession, {
    id: 42, startedAt: '2026-10-03T10:00:00Z', isOpen: true, durationSeconds: null, templateId: 7, templateName: 'Push Day',
    progress: [{ exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 3, completedSets: 0, restSeconds: 90 }],
  });
  requestMock.mockRejectedValue(new TypeError('Network request failed'));
  const { result } = await renderHook(kancalar, { wrapper: sarmalayici(false) });

  await act(async () => {
    await result.current.setEkle.mutateAsync({ exerciseId: 1, weight: 60, reps: 8, rir: null, durationSeconds: null });
  });

  expect(queryClient.getQueryData<SetKaydi[]>(queryKeys.sessionSets(42))).toHaveLength(1);
  const kuyruk = await diskKuyrugu();
  expect(kuyruk[0]).toMatchObject({ tur: 'setEkle', oturumId: 42 });
});

/** Sunucunun reddettigi istek (dogrulama) kuyruga girmez: hatasi ekranda gorunsun diye cagirana doner. */
test('sunucunun reddettigi set kuyruga girmez, hata cagirana doner', async () => {
  requestMock.mockRejectedValue(new ApiError(400, 'Ağırlık zorunlu.'));
  const { result } = await renderHook(kancalar, { wrapper: sarmalayici(false) });

  await act(async () => {
    await expect(
      result.current.setEkle.mutateAsync({ exerciseId: 1, weight: null, reps: 8, rir: null, durationSeconds: null }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  expect(await diskKuyrugu()).toEqual([]);
});

/** Kullanici karari: cevrimdisi bitirilen antrenman gecmiste HEMEN gorunur (set sayisi, sure, hacim). */
test('cevrimdisi bitirilen antrenman gecmisin en ustunde hemen gorunur', async () => {
  queryClient.setQueryData(queryKeys.historyInfinite, {
    pages: [{ items: [{ sessionId: 1, templateName: 'Eski' }], page: 1, pageSize: 25, totalCount: 1, totalPages: 1 }],
    pageParams: [1],
  });
  const { result } = await renderHook(kancalar, { wrapper: sarmalayici(true) });
  await act(async () => {
    await result.current.baslat.mutateAsync(7);
  });
  await act(async () => {
    await result.current.setEkle.mutateAsync({ exerciseId: 1, weight: 60, reps: 8, rir: null, durationSeconds: null });
  });
  const oturumId = queryClient.getQueryData<AcikOturum>(queryKeys.openSession)!.id;

  await act(async () => {
    await result.current.bitir.mutateAsync({ sessionId: oturumId, zorluk: 'Hard' });
  });

  const gecmis = queryClient.getQueryData<{ pages: GecmisSayfasi[] }>(queryKeys.historyInfinite)!;
  expect(gecmis.pages[0].items[0]).toMatchObject({ sessionId: oturumId, templateName: 'Push Day', setCount: 1, totalVolume: 480 });
  expect(gecmis.pages[0].items[1]).toMatchObject({ templateName: 'Eski' });
  expect((await diskKuyrugu()).map((islem) => islem.tur)).toEqual(['oturumBaslat', 'setEkle', 'oturumBitir']);
});

/** Baglanti gelince kuyruk sirayla gonderilir (gecici kimlikler gercekle eslenir) ve bosalir. */
test('baglanti gelince kuyruk sirayla gonderilir ve bosalir', async () => {
  const kuyruk: BekleyenIslem[] = [
    { tur: 'oturumBaslat', anahtar: 'a1', oturumId: -5, templateId: 7, startedAt: '2026-10-03T10:00:00Z' },
    {
      tur: 'setEkle', anahtar: 's1', oturumId: -5, setId: -6, exerciseId: 1, weight: 60, reps: 8, rir: null,
      durationSeconds: null, createdAt: '2026-10-03T10:05:00Z',
    },
  ];
  await AsyncStorage.setItem(kuyrukAnahtari('ada'), JSON.stringify(kuyruk));
  requestMock.mockImplementation(async (yol: string) => (yol === '/sessions' ? { id: 501 } : { id: 900 }));

  await renderHook(kancalar, { wrapper: sarmalayici(false) });

  await waitFor(async () => expect(await diskKuyrugu()).toEqual([]));
  expect(requestMock.mock.calls.map(([yol]) => yol).filter((yol: string) => yol.startsWith('/sessions'))).toEqual([
    '/sessions',
    '/sessions/501/sets',
  ]);
});
