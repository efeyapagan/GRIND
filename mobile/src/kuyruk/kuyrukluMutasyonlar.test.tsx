import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import { ApiError } from '@grind/shared/api/problem';
import { queryKeys, type AcikOturum, type GecmisSayfasi, type Sablon, type SetKaydi, type TakvimOzeti } from '@grind/shared/api/queries';
import { trBugundenOnce } from '@grind/shared/lib/format';
import { BaglantiBaglami } from '../baglanti/BaglantiSaglayici';
import KuyrukSaglayici, { kuyrukAnahtari } from './KuyrukSaglayici';
import {
  useKuyrukluAddSet,
  useKuyrukluCreateTemplate,
  useKuyrukluDeleteTemplate,
  useKuyrukluFinishSession,
  useKuyrukluSablonlariSirala,
  useKuyrukluStartSession,
  useKuyrukluUpdateTemplate,
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

/** Kullanici karari: cevrimdisi bitirilen antrenman takvimde ve haftalik hedefte de hemen gorunur. */
test('cevrimdisi bitirilen antrenman takvime ve haftalik hedefe hemen islenir', async () => {
  const bugun = trBugundenOnce(0);
  const bos: TakvimOzeti = {
    days: [], trainedDayCount: 0, currentWeekStreak: 2, longestWeekStreak: 5, thisWeekTrainedDays: 0,
    weeklyTargetDays: 3, currentTargetStreak: 0,
  };
  queryClient.setQueryData(queryKeys.calendar(bugun, bugun), bos);
  // #654: gecmis bir donemin hedef alanlari o donemin son haftasina aittir.
  const [eskiBas, eskiSon] = [trBugundenOnce(40), trBugundenOnce(34)];
  queryClient.setQueryData(queryKeys.calendar(eskiBas, eskiSon), { ...bos, thisWeekTrainedDays: 2 });
  const { result } = await renderHook(kancalar, { wrapper: sarmalayici(true) });
  await act(async () => {
    await result.current.baslat.mutateAsync(7);
  });
  await act(async () => {
    await result.current.setEkle.mutateAsync({ exerciseId: 1, weight: 60, reps: 8, rir: null, durationSeconds: null });
  });
  const oturumId = queryClient.getQueryData<AcikOturum>(queryKeys.openSession)!.id;

  await act(async () => {
    await result.current.bitir.mutateAsync({ sessionId: oturumId, zorluk: null });
  });

  const takvim = queryClient.getQueryData<TakvimOzeti>(queryKeys.calendar(bugun, bugun))!;
  expect(takvim.days).toEqual([{ date: bugun, sessionCount: 1, setCount: 1 }]);
  expect(takvim.trainedDayCount).toBe(1);
  expect(takvim.thisWeekTrainedDays).toBe(1);
  expect(queryClient.getQueryData<TakvimOzeti>(queryKeys.calendar(eskiBas, eskiSon))!.thisWeekTrainedDays).toBe(2);
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


function sablonKancalari() {
  return {
    olustur: useKuyrukluCreateTemplate(),
    guncelle: useKuyrukluUpdateTemplate(),
    sil: useKuyrukluDeleteTemplate(),
    sirala: useKuyrukluSablonlariSirala(),
    baslat: useKuyrukluStartSession(),
  };
}

const LEG_DAY = { name: 'Leg Day', exercises: [{ exerciseId: 1, plannedSets: 4, restSeconds: 120 }] };

/** #174 dilim 3: cevrimdisi olusturulan sablon listede hemen gorunur, anahtariyla kuyruga yazilir. */
test('cevrimdisi sablon olusturma listeye hemen ekler ve kuyruga yazar', async () => {
  const { result } = await renderHook(sablonKancalari, { wrapper: sarmalayici(true) });

  await act(async () => {
    await result.current.olustur.mutateAsync(LEG_DAY);
  });

  const liste = queryClient.getQueryData<Sablon[]>(queryKeys.templates)!;
  expect(liste.map((s) => s.name)).toEqual(['Push Day', 'Leg Day']);
  expect(liste[1].id).toBeLessThan(0);
  expect(liste[1].exercises[0]).toMatchObject({ exerciseName: 'Bench Press', plannedSets: 4 });
  const kuyruk = await diskKuyrugu();
  expect(kuyruk).toEqual([expect.objectContaining({ tur: 'sablonOlustur', sablonId: liste[1].id, name: 'Leg Day' })]);
  expect(requestMock).not.toHaveBeenCalled();
});

/** Sunucu ayni adi 409 ile reddeder; cevrimdisi cihaz yakalar, kuyruga yazmaz (yoksa sablon sonra kaybolurdu). */
test('cevrimdisi ayni adla olusturma reddedilir, kuyruga yazilmaz', async () => {
  const { result } = await renderHook(sablonKancalari, { wrapper: sarmalayici(true) });

  let hata: unknown;
  await act(async () => {
    await result.current.olustur.mutateAsync({ ...LEG_DAY, name: '  push day ' }).catch((e: unknown) => {
      hata = e;
    });
  });

  expect(hata).toBeInstanceOf(ApiError);
  expect((hata as ApiError).status).toBe(409);
  expect(queryClient.getQueryData<Sablon[]>(queryKeys.templates)).toHaveLength(1);
  expect(await diskKuyrugu()).toEqual([]);
});

/** Cevrimiciyken sunucunun reddi ekrana gider; ag hatasi gibi kuyruga dusmez. Anahtar cevrimici istekte de gider. */
test('cevrimici ApiError kuyruga yazilmaz, istek istemci anahtarini tasir', async () => {
  requestMock.mockRejectedValue(new ApiError(409, 'cakisma'));
  const { result } = await renderHook(sablonKancalari, { wrapper: sarmalayici(false) });

  await act(async () => {
    await result.current.olustur.mutateAsync(LEG_DAY).catch(() => undefined);
  });

  expect(JSON.parse(requestMock.mock.calls[0][1].body).clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
  expect(await diskKuyrugu()).toEqual([]);
});

/** Kullanici karari: telefondaki sablon cevrimdisi duzenlenir, siralanir ve silinir. */
test('cevrimdisi duzenleme, siralama ve silme listeye hemen yansir', async () => {
  queryClient.setQueryData(queryKeys.templates, [SABLON, { ...SABLON, id: 8, name: 'Pull Day' }]);
  queryClient.setQueryData(queryKeys.template(7), SABLON);
  const { result } = await renderHook(sablonKancalari, { wrapper: sarmalayici(true) });

  await act(async () => {
    await result.current.guncelle.mutateAsync({ id: 7, girdi: { ...LEG_DAY, name: 'Push B' } });
  });
  expect(queryClient.getQueryData<Sablon>(queryKeys.template(7))?.name).toBe('Push B');

  await act(async () => {
    await result.current.sirala.mutateAsync([8, 7]);
  });
  expect(queryClient.getQueryData<Sablon[]>(queryKeys.templates)!.map((s) => s.id)).toEqual([8, 7]);

  await act(async () => {
    await result.current.sil.mutateAsync(8);
  });
  expect(queryClient.getQueryData<Sablon[]>(queryKeys.templates)!.map((s) => s.name)).toEqual(['Push B']);
  expect((await diskKuyrugu()).map((islem) => islem.tur)).toEqual(['sablonGuncelle', 'sablonSirala', 'sablonSil']);
  expect(requestMock).not.toHaveBeenCalled();
});

/**
 * Uctan uca: cevrimdisi olusturulan sablonla antrenman yapilir; internet gelince sablon once olusur, antrenman
 * sunucunun verdigi gercek sablon kimligiyle baslar.
 */
test('cevrimdisi yeni sablonla antrenman, baglanti gelince sablon gercek kimligiyle gider', async () => {
  let cevrimdisi = true;
  function Degisken({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BaglantiBaglami.Provider value={cevrimdisi}>
          <KuyrukSaglayici>{children}</KuyrukSaglayici>
        </BaglantiBaglami.Provider>
      </QueryClientProvider>
    );
  }
  const { result, rerender } = await renderHook(() => ({ ...sablonKancalari(), ...kancalar() }), { wrapper: Degisken });

  await act(async () => {
    const sablon = await result.current.olustur.mutateAsync(LEG_DAY);
    const oturum = await result.current.baslat.mutateAsync(sablon.id);
    expect(oturum.templateName).toBe('Leg Day');
    await result.current.setEkle.mutateAsync({ sessionId: oturum.id, exerciseId: 1, weight: 100, reps: 5, rir: null, durationSeconds: null });
    await result.current.bitir.mutateAsync({ sessionId: oturum.id, zorluk: null });
  });

  requestMock.mockImplementation(async (yol: string) => {
    if (yol === '/templates') return { id: 70 };
    if (yol === '/sessions') return { id: 501 };
    if (yol === '/sessions/501/sets') return { id: 900 };
    return {};
  });
  cevrimdisi = false;
  await rerender({});

  await waitFor(async () => expect(await diskKuyrugu()).toEqual([]));
  const gidenler = requestMock.mock.calls.filter(([, secenek]) => secenek?.method).map(([yol]) => yol);
  expect(gidenler).toEqual(['/templates', '/sessions', '/sessions/501/sets', '/sessions/501/finish']);
  const baslatma = requestMock.mock.calls.find(([yol]) => yol === '/sessions')!;
  expect(JSON.parse(baslatma[1].body).templateId).toBe(70);
});
