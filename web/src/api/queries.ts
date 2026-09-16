import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { request } from './client';
import { trBugundenOnce } from '../lib/format';
import { ApiError } from './problem';
import type { components } from './schema';

type SessionResponse = components['schemas']['SessionResponse'];
type SetEntryResponse = components['schemas']['SetEntryResponse'];
type ExerciseResponse = components['schemas']['ExerciseResponse'];
type CreateSetRequest = components['schemas']['CreateSetRequest'];
type PatchSetRequest = components['schemas']['PatchSetRequest'];
type HistorySessionResponse = components['schemas']['HistorySessionResponse'];
type HistorySessionResponsePagedResponse = components['schemas']['HistorySessionResponsePagedResponse'];
type ExerciseRecordResponse = components['schemas']['ExerciseRecordResponse'];
type TemplateResponse = components['schemas']['TemplateResponse'];
type TemplateExerciseResponse = components['schemas']['TemplateExerciseResponse'];
type CreateTemplateRequest = components['schemas']['CreateTemplateRequest'];
type SessionProgressResponse = components['schemas']['SessionProgressResponse'];
type StartSessionRequest = components['schemas']['StartSessionRequest'];
type ExerciseProgressResponse = components['schemas']['ExerciseProgressResponse'];
type ExerciseProgressPointResponse = components['schemas']['ExerciseProgressPointResponse'];
type CalendarResponse = components['schemas']['CalendarResponse'];
type CalendarDayResponse = components['schemas']['CalendarDayResponse'];
type UpdateWeeklyTargetRequest = components['schemas']['UpdateWeeklyTargetRequest'];
type AiInsightResponse = components['schemas']['AiInsightResponse'];
type AiInsightResponsePagedResponse = components['schemas']['AiInsightResponsePagedResponse'];

/**
 * Sorgu anahtarlari TEK bir yerde tutulur (spec) -- Task 5'teki `useRecords()` de ayni
 * `records` anahtarini kullanacak, set eklendikten sonra burasi invalidate edilir ki
 * "tum zamanlarin rekorlari" ekrani bayat kalmasin.
 *
 * `historyAll`, `history(page)`nin ONEKI (prefix) olarak tutulur -- yeni bir set gecmisteki
 * set sayisini/hacmini ve (sayfa 1'e yeni bir oturum ekleyerek) sayfalamayi da etkiler (review
 * bulgusu M1). Tek bir sayfayi invalidate etmek digerlerini bayat birakirdi; `historyAll` ile
 * invalidate etmek TUM sayfalari (query key prefix eslesmesiyle) kapsar. Ham bir string literal
 * ('history') yerine bu nesne uzerinden gidilir ki anahtar TEK bir yerde tanimli kalsin (DRY).
 */
export const queryKeys = {
  openSession: ['openSession'] as const,
  sessionSets: (sessionId: number | null) => ['sessionSets', sessionId] as const,
  exercises: ['exercises'] as const,
  records: ['records'] as const,
  historyAll: ['history'] as const,
  history: (page: number) => [...queryKeys.historyAll, page] as const,
  // Takvimde secilen gunun oturumlari (#90); `historyAll` oneki altinda, set degisince o da tazelenir.
  historyDay: (gun: string | null) => [...queryKeys.historyAll, 'gun', gun] as const,
  templates: ['templates'] as const,
  // BILEREK `templates`in oneki DEGIL: liste invalidate edilince acik duzenleyicinin detayi yeniden
  // cekilmesin (silmeden hemen sonra 404'e dusmesin).
  template: (id: number) => ['template', id] as const,
  // Onek: bir egzersizin TUM araliklarini tek seferde tazelemek icin (set eklenince).
  // `exerciseProgressRoot` ise TUM hareketleri kapsar -- bir oturum silinince hangi hareketlerin
  // etkilendigi istemcide bilinmez (setler yanitla birlikte gelmez), bu yuzden kok onekten
  // invalidate edilir. `historyAll` ile ayni gerekce: ham string literal yerine anahtar TEK
  // bir yerde tanimli kalir (DRY).
  exerciseProgressRoot: ['exerciseProgress'] as const,
  exerciseProgressAll: (exerciseId: number) =>
    [...queryKeys.exerciseProgressRoot, exerciseId] as const,
  exerciseProgress: (exerciseId: number, aralik: IlerlemeAraligi) =>
    [...queryKeys.exerciseProgressAll(exerciseId), aralik] as const,
  // Onek: set eklenince/silinince gezinilmis TUM ay ve haftalar tazelensin (#81).
  calendarAll: ['calendar'] as const,
  calendar: (from: string, to: string) => [...queryKeys.calendarAll, from, to] as const,
  // Onek: yeni bir yorum uretilince (ya da silinince) TUM sayfalar tazelensin (issue #76) --
  // `historyAll` ile ayni gerekce.
  insightsAll: ['insights'] as const,
  insights: (page: number) => [...queryKeys.insightsAll, page] as const,
};

export interface HareketIlerlemesi {
  exerciseId: number;
  exerciseName: string;
  // null = hedefsiz: antrenmana sonradan eklenen ya da sablon disi set girilen hareket (#62).
  plannedSets: number | null;
  completedSets: number;
  restSeconds: number;
}

export interface AcikOturum {
  id: number;
  startedAt: string;
  isOpen: boolean;
  templateId: number | null;
  templateName: string | null;
  // Sablonsuz oturumda bos. Sira, hedef ve gerceklesen sayilar SUNUCUDAN gelir (spec Karar 8).
  progress: HareketIlerlemesi[];
}

export interface SetKaydi {
  id: number;
  sessionId: number;
  exerciseId: number;
  exerciseName: string;
  weight: number;
  reps: number;
  recordType: components['schemas']['RecordType'];
  rir: number | null;
  createdAt: string;
  // #71: oturumdaki bir onceki setten bu yana gecen GERCEK sure (sn), sunucudan; ilk sette null.
  restSeconds: number | null;
}

export type EgzersizKategorisi = components['schemas']['ExerciseCategory'];

export interface Egzersiz {
  id: number;
  name: string;
  // #77: hareket secicideki kategori filtresi icin.
  category: EgzersizKategorisi;
}

/**
 * schema.d.ts'te her alan optional (Swashbuckle bunlari required isaretlemedi), ama sunucu
 * hepsini doldurur. AuthContext'teki `dogrulanmisKimlikYaniti` ile ayni desen: dogrulamayi TEK
 * bir yerde yapip cagiran taraflari "!" ile susturmak yerine, gercekten eksik bir yanit gelirse
 * sessizce yutmadan haber veriyoruz.
 */
function dogrulanmisIlerleme(yanit: SessionProgressResponse): HareketIlerlemesi {
  if (
    yanit.exerciseId === undefined ||
    !yanit.exerciseName ||
    yanit.plannedSets === undefined ||
    yanit.completedSets === undefined ||
    yanit.restSeconds === undefined
  ) {
    throw new Error('Sunucudan eksik ilerleme yaniti alindi.');
  }
  return {
    exerciseId: yanit.exerciseId,
    exerciseName: yanit.exerciseName,
    // `undefined` eksik yanittir (yukarida reddedilir); `null` gecerlidir: hedefsiz hareket.
    plannedSets: yanit.plannedSets,
    completedSets: yanit.completedSets,
    restSeconds: yanit.restSeconds,
  };
}

function dogrulanmisOturum(yanit: SessionResponse): AcikOturum {
  if (yanit.id === undefined || !yanit.startedAt || yanit.isOpen === undefined) {
    throw new Error('Sunucudan eksik oturum yaniti alindi.');
  }
  return {
    id: yanit.id,
    startedAt: yanit.startedAt,
    isOpen: yanit.isOpen,
    templateId: yanit.templateId ?? null,
    templateName: yanit.templateName ?? null,
    progress: (yanit.progress ?? []).map(dogrulanmisIlerleme),
  };
}

function dogrulanmisSet(yanit: SetEntryResponse): SetKaydi {
  if (
    yanit.id === undefined ||
    yanit.sessionId === undefined ||
    yanit.exerciseId === undefined ||
    !yanit.exerciseName ||
    yanit.weight === undefined ||
    yanit.reps === undefined ||
    !yanit.recordType ||
    !yanit.createdAt
  ) {
    throw new Error('Sunucudan eksik set yaniti alindi.');
  }
  return {
    id: yanit.id,
    sessionId: yanit.sessionId,
    exerciseId: yanit.exerciseId,
    exerciseName: yanit.exerciseName,
    weight: yanit.weight,
    reps: yanit.reps,
    recordType: yanit.recordType,
    rir: yanit.rir ?? null,
    createdAt: yanit.createdAt,
    restSeconds: yanit.restSeconds ?? null,
  };
}

function dogrulanmisEgzersiz(yanit: ExerciseResponse): Egzersiz {
  if (yanit.id === undefined || !yanit.name || !yanit.category) {
    throw new Error('Sunucudan eksik egzersiz yaniti alindi.');
  }
  return { id: yanit.id, name: yanit.name, category: yanit.category };
}

export interface GecmisOturum {
  sessionId: number;
  startedAt: string;
  templateName: string | null;
  totalVolume: number;
  setCount: number;
  // #71: gosterilen setlerin dinlenme medyani (sn), sunucudan; hic dinlenme yoksa null.
  medianRestSeconds: number | null;
  sets: SetKaydi[];
}

export interface GecmisSayfasi {
  items: GecmisOturum[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * `setCount`/`totalVolume` icin `!yanit.setCount` degil `=== undefined` kontrolu YAPILIR --
 * `0` gecerli (ve spec'e gore GIZLENMEMESI gereken) bir deger, "eksik" degil. Setler yanitin
 * ICINDE gelir (spec) -- ayri bir istek atilmaz, var olan `dogrulanmisSet` burada da kullanilir.
 */
function dogrulanmisGecmisOturum(yanit: HistorySessionResponse): GecmisOturum {
  if (
    yanit.sessionId === undefined ||
    !yanit.startedAt ||
    yanit.totalVolume === undefined ||
    yanit.setCount === undefined
  ) {
    throw new Error('Sunucudan eksik gecmis oturum yaniti alindi.');
  }
  return {
    sessionId: yanit.sessionId,
    startedAt: yanit.startedAt,
    templateName: yanit.templateName ?? null,
    totalVolume: yanit.totalVolume,
    setCount: yanit.setCount,
    medianRestSeconds: yanit.medianRestSeconds ?? null,
    sets: (yanit.sets ?? []).map(dogrulanmisSet),
  };
}

function dogrulanmisGecmisSayfasi(yanit: HistorySessionResponsePagedResponse): GecmisSayfasi {
  if (
    yanit.page === undefined ||
    yanit.pageSize === undefined ||
    yanit.totalCount === undefined ||
    yanit.totalPages === undefined
  ) {
    throw new Error('Sunucudan eksik gecmis sayfasi yaniti alindi.');
  }
  return {
    items: (yanit.items ?? []).map(dogrulanmisGecmisOturum),
    page: yanit.page,
    pageSize: yanit.pageSize,
    totalCount: yanit.totalCount,
    totalPages: yanit.totalPages,
  };
}

export interface EgzersizRekoru {
  exerciseId: number;
  exerciseName: string;
  bestWeight: number;
  bestWeightReps: number;
  bestWeightAt: string;
  bestReps: number;
  bestRepsWeight: number;
  bestRepsAt: string;
}

/**
 * En agir set ve en cok tekrar BILEREK ayri iki alan grubu olarak tutulur (spec) -- bunlar
 * cogu zaman farkli setlerdir, tek bir "en iyi" degere indirgemek bilgi kaybettirir.
 */
function dogrulanmisRekor(yanit: ExerciseRecordResponse): EgzersizRekoru {
  if (
    yanit.exerciseId === undefined ||
    !yanit.exerciseName ||
    yanit.bestWeight === undefined ||
    yanit.bestWeightReps === undefined ||
    !yanit.bestWeightAt ||
    yanit.bestReps === undefined ||
    yanit.bestRepsWeight === undefined ||
    !yanit.bestRepsAt
  ) {
    throw new Error('Sunucudan eksik rekor yaniti alindi.');
  }
  return {
    exerciseId: yanit.exerciseId,
    exerciseName: yanit.exerciseName,
    bestWeight: yanit.bestWeight,
    bestWeightReps: yanit.bestWeightReps,
    bestWeightAt: yanit.bestWeightAt,
    bestReps: yanit.bestReps,
    bestRepsWeight: yanit.bestRepsWeight,
    bestRepsAt: yanit.bestRepsAt,
  };
}

/**
 * Acik oturum yoksa sunucu 404 doner -- bu bir hata degil, "bugun henuz antrenman yok" bos
 * durumudur (spec). 404'u `null`'a cevirip `retry: false` kullaniyoruz ki yoklugu dogrulamak
 * icin gereksiz yeniden denemeler yapilmasin; 404 disindaki her hata normal sekilde firlar.
 */
export function useOpenSession() {
  return useQuery({
    queryKey: queryKeys.openSession,
    queryFn: async (): Promise<AcikOturum | null> => {
      try {
        const yanit = await request<SessionResponse>('/sessions/open');
        return dogrulanmisOturum(yanit);
      } catch (hata) {
        if (hata instanceof ApiError && hata.status === 404) {
          return null;
        }
        throw hata;
      }
    },
    retry: false,
  });
}

export function useSessionSets(sessionId: number | null) {
  return useQuery({
    queryKey: queryKeys.sessionSets(sessionId),
    queryFn: async (): Promise<SetKaydi[]> => {
      const yanit = await request<SetEntryResponse[]>(`/sessions/${sessionId}/sets`);
      return yanit.map(dogrulanmisSet);
    },
    enabled: sessionId !== null,
  });
}

export function useExercises() {
  return useQuery({
    queryKey: queryKeys.exercises,
    queryFn: async (): Promise<Egzersiz[]> => {
      const yanit = await request<ExerciseResponse[]>('/exercises');
      return yanit.map(dogrulanmisEgzersiz);
    },
  });
}

/**
 * Sayfalama TAMAMEN sunucunun zarfindan (`page`/`totalPages`) surulur -- istemci ne toplam
 * sayfa sayisini ne de toplam kaydi kendisi HESAPLAR (spec). `PageSize` bilerek GONDERILMEZ:
 * bu dilim filtre/boyut secimi sunmuyor (KISS), sunucunun varsayilani (20) kullanilir.
 */
export function useHistory(page: number) {
  return useQuery({
    queryKey: queryKeys.history(page),
    queryFn: async (): Promise<GecmisSayfasi> => {
      const yanit = await request<HistorySessionResponsePagedResponse>(`/history?Page=${page}`);
      return dogrulanmisGecmisSayfasi(yanit);
    },
  });
}

/**
 * Takvimde secilen tek TR gununun oturumlari (#90), sablon adlari icin. `null` gun istek atmaz. DIKKAT:
 * gecmis ucu seti olmayan oturumu da dondurur; takvimle tutarli kalmak cagiranin isidir (`setCount`).
 * Bir gunde sunucunun varsayilan sayfa boyutundan (20) fazla oturum beklenmez.
 */
export function useGunGecmisi(gun: string | null) {
  return useQuery({
    queryKey: queryKeys.historyDay(gun),
    queryFn: async (): Promise<GecmisOturum[]> => {
      const yanit = await request<HistorySessionResponsePagedResponse>(`/history?From=${gun}&To=${gun}`);
      return dogrulanmisGecmisSayfasi(yanit).items;
    },
    enabled: gun !== null,
  });
}

export type IlerlemeAraligi = '1a' | '3a' | 'tum';

export interface IlerlemeNoktasi {
  sessionId: number;
  startedAt: string;
  topWeight: number;
  topWeightReps: number;
  volume: number;
  setCount: number;
  // Tahmin edilemeyen oturumda null (0 kg ya da 12'den fazla tekrar).
  estimatedOneRepMax: number | null;
}

/** `0` gecerli bir deger: kontroller `=== undefined` ile, `!` ile degil. */
function dogrulanmisIlerlemeNoktasi(yanit: ExerciseProgressPointResponse): IlerlemeNoktasi {
  if (
    yanit.sessionId === undefined ||
    !yanit.startedAt ||
    yanit.topWeight === undefined ||
    yanit.topWeightReps === undefined ||
    yanit.volume === undefined ||
    yanit.setCount === undefined ||
    yanit.estimatedOneRepMax === undefined
  ) {
    throw new Error('Sunucudan eksik ilerleme noktasi alindi.');
  }
  return {
    sessionId: yanit.sessionId,
    startedAt: yanit.startedAt,
    topWeight: yanit.topWeight,
    topWeightReps: yanit.topWeightReps,
    volume: yanit.volume,
    setCount: yanit.setCount,
    estimatedOneRepMax: yanit.estimatedOneRepMax,
  };
}

const ARALIK_GUNLERI: Record<IlerlemeAraligi, number | null> = { '1a': 30, '3a': 90, tum: null };

/**
 * `points` schema.d.ts'te optional (Swashbuckle bunu required isaretlemedi) ama sunucu HER ZAMAN
 * doldurur -- diger `dogrulanmis*` fonksiyonlariyla ayni desen: eksik gelirse `?? []` ile sessizce
 * yutmak yerine acikca hata firlatilir (review bulgusu M6).
 */
function dogrulanmisHareketIlerlemesi(yanit: ExerciseProgressResponse): IlerlemeNoktasi[] {
  if (yanit.points === undefined || yanit.points === null) {
    throw new Error('Sunucudan eksik hareket ilerlemesi yaniti alindi.');
  }
  return yanit.points.map(dogrulanmisIlerlemeNoktasi);
}

/**
 * Hareket ilerleme grafiginin verisi (dilim 3 spec Karar 2 ve 5), eskiden yeniye. En agir set, hacim
 * ve tahmini 1RM SUNUCUDAN gelir; istemci yalnizca araligin baslangic gununu (TR) hesaplar.
 */
export function useExerciseProgress(exerciseId: number, aralik: IlerlemeAraligi) {
  return useQuery({
    queryKey: queryKeys.exerciseProgress(exerciseId, aralik),
    queryFn: async (): Promise<IlerlemeNoktasi[]> => {
      const gun = ARALIK_GUNLERI[aralik];
      const sorgu = gun === null ? '' : `?From=${trBugundenOnce(gun)}`;
      const yanit = await request<ExerciseProgressResponse>(`/stats/exercises/${exerciseId}/progress${sorgu}`);
      return dogrulanmisHareketIlerlemesi(yanit);
    },
    // M5 (review bulgusu): aralik degisince (1 Ay -> 3 Ay gibi) onceki noktalar yeni veri gelene
    // kadar EKRANDA KALIR -- aksi halde kisa bir "Yükleniyor..." yanip grafik cokup tekrar acilir.
    placeholderData: keepPreviousData,
  });
}

export interface TakvimGunu {
  date: string;
  sessionCount: number;
  setCount: number;
}

export interface TakvimOzeti {
  // Yalnizca antrenman yapilmis gunler (seti olmayan oturum sayilmaz), eskiden yeniye.
  days: TakvimGunu[];
  trainedDayCount: number;
  // #96: seriler HAFTA sayar; tum gecmisten, araliktan bagimsiz.
  currentWeekStreak: number;
  longestWeekStreak: number;
  thisWeekTrainedDays: number;
  // #97: null = hedef yok; o zaman hedef serisi de null.
  weeklyTargetDays: number | null;
  currentTargetStreak: number | null;
}

function dogrulanmisTakvimGunu(yanit: CalendarDayResponse): TakvimGunu {
  if (!yanit.date || yanit.sessionCount === undefined || yanit.setCount === undefined) {
    throw new Error('Sunucudan eksik takvim gunu alindi.');
  }
  return { date: yanit.date, sessionCount: yanit.sessionCount, setCount: yanit.setCount };
}

function dogrulanmisTakvim(yanit: CalendarResponse): TakvimOzeti {
  // `null` gecerli (hedef yok); yalnizca `undefined` eksik yanittir.
  if (
    !yanit.days ||
    yanit.trainedDayCount === undefined ||
    yanit.currentWeekStreak === undefined ||
    yanit.longestWeekStreak === undefined ||
    yanit.thisWeekTrainedDays === undefined ||
    yanit.weeklyTargetDays === undefined ||
    yanit.currentTargetStreak === undefined
  ) {
    throw new Error('Sunucudan eksik takvim yaniti alindi.');
  }
  return {
    days: yanit.days.map(dogrulanmisTakvimGunu),
    trainedDayCount: yanit.trainedDayCount,
    currentWeekStreak: yanit.currentWeekStreak,
    longestWeekStreak: yanit.longestWeekStreak,
    thisWeekTrainedDays: yanit.thisWeekTrainedDays,
    weeklyTargetDays: yanit.weeklyTargetDays,
    currentTargetStreak: yanit.currentTargetStreak,
  };
}

/**
 * Takvim (#81): `from`-`to` araligindaki antrenman gunleri ve seriler. Seriler araliktan bagimsiz, tum
 * gecmisten sunucuda hesaplanir; istemci yeniden saymaz.
 */
export function useCalendar(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.calendar(from, to),
    queryFn: async (): Promise<TakvimOzeti> =>
      dogrulanmisTakvim(await request<CalendarResponse>(`/stats/calendar?From=${from}&To=${to}`)),
    // Ay/hafta degisince onceki izgara yeni veri gelene kadar yerinde kalir (useExerciseProgress ile ayni).
    placeholderData: keepPreviousData,
  });
}

/**
 * Takvim disindaki ekranlar (#117: Rekorlar'da en uzun seri, Profil'de haftalik hedef) yalnizca aralıktan
 * bagimsiz alanlari okur; bu yuzden ayni uc bugunun tek gunluk araligiyla istenir.
 */
export function useGuncelTakvimOzeti() {
  const bugun = trBugundenOnce(0);
  return useCalendar(bugun, bugun);
}

/**
 * `PUT /api/settings/weekly-target` (#97), govdesiz 204. `null` hedefi kaldirir. Hedef ve hedef serisi
 * takvim yanitinda geldigi icin basarida TUM takvim araliklari tazelenir.
 */
export function useSetWeeklyTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (weeklyTargetDays: number | null): Promise<void> => {
      const govde: UpdateWeeklyTargetRequest = { weeklyTargetDays };
      await request<void>('/settings/weekly-target', { method: 'PUT', body: JSON.stringify(govde) });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.calendarAll });
    },
  });
}

/**
 * Polling YOK (spec) -- yalnizca `useAddSet`in basarili olunca invalidate ettigi `records`
 * anahtari araciligiyla tazelenir.
 */
export function useRecords() {
  return useQuery({
    queryKey: queryKeys.records,
    queryFn: async (): Promise<EgzersizRekoru[]> => {
      const yanit = await request<ExerciseRecordResponse[]>('/records');
      return yanit.map(dogrulanmisRekor);
    },
  });
}

export interface YeniSetGirdisi {
  exerciseId: number;
  weight: number;
  reps: number;
  rir: number | null;
}

/**
 * `POST /api/sets` oturum id'si ALMAZ -- sunucu bugunun acik oturumunu bulur ya da kendiliginden
 * acar (spec). Bu yuzden bos durumda ayri bir "oturum baslat" dugmesine gerek yok: ilk set
 * eklendiginde oturum kendiliginden dogar.
 */
export function useAddSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (girdi: YeniSetGirdisi): Promise<SetKaydi> => {
      const govde: CreateSetRequest = {
        exerciseId: girdi.exerciseId,
        weight: girdi.weight,
        reps: girdi.reps,
        rir: girdi.rir,
      };
      const yanit = await request<SetEntryResponse>('/sets', {
        method: 'POST',
        body: JSON.stringify(govde),
      });
      return dogrulanmisSet(yanit);
    },
    onSuccess: (set) => setDegistiTazele(queryClient, set),
  });
}

/**
 * Bir set eklendikten, duzeltildikten ya da silindikten SONRA tazelenecekler (#57 ile uc akista
 * ortak). Sunucu her ucta o hareketin rekorlarini yeniden hesaplar.
 */
export function setDegistiTazele(
  queryClient: QueryClient,
  set: { sessionId: number; exerciseId: number },
): void {
  // Set hangi oturuma ait yanittaki/kayittaki sessionId'den bilinir -- acik oturum (ilerleme), o
  // oturumun setleri ve rekorlar invalidate edilir (spec).
  void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSets(set.sessionId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.records });
  // Set gecmisteki set sayisini/hacmini ve sayfa 1'in icerigini de degistirebilir
  // (review bulgusu M1) -- `historyAll` ONEKI ile invalidate etmek TUM sayfalari kapsar.
  void queryClient.invalidateQueries({ queryKey: queryKeys.historyAll });
  // Grafigin bugunku noktasi guncellensin (dilim 3): setin hareketinin TUM araliklari.
  void queryClient.invalidateQueries({ queryKey: queryKeys.exerciseProgressAll(set.exerciseId) });
  // Takvim yalnizca seti olan gunleri sayar: ilk set gunu takvime sokar, son setin silinmesi cikarir (#81).
  void queryClient.invalidateQueries({ queryKey: queryKeys.calendarAll });
}

export interface SetDuzeltmesi {
  id: number;
  weight: number;
  reps: number;
  rir: number | null;
}

/**
 * `PATCH /api/sets/{id}` (#57). Uc alan da gonderilir. DIKKAT: sunucuda `null` "degistirme" demektir,
 * yani RIR bu uc ile BOSALTILAMAZ.
 */
export function useUpdateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...alanlar }: SetDuzeltmesi): Promise<SetKaydi> => {
      const govde: PatchSetRequest = alanlar;
      const yanit = await request<SetEntryResponse>(`/sets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(govde),
      });
      return dogrulanmisSet(yanit);
    },
    onSuccess: (set) => setDegistiTazele(queryClient, set),
  });
}

/**
 * `DELETE /api/sets/{id}` (#57), govdesiz 204. Hook degil duz fonksiyon: geri alma penceresi acikken
 * sayfadan cikilirsa silme bilesen kaldirildiktan sonra tamamlanir (bkz. `oturumuSil`).
 */
export async function setiSil(id: number): Promise<void> {
  await request<void>(`/sets/${id}`, { method: 'DELETE' });
}

export function useFinishSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: number): Promise<void> => {
      await request<SessionResponse>(`/sessions/${sessionId}/finish`, { method: 'POST' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
    },
  });
}

/**
 * `POST /api/sessions/{id}/exercises` (#62): hareketi antrenmanin sonuna hedefsiz ekler. Yanit guncel
 * oturumdur; yeni kart beklemeden gorunsun diye acik oturum onbellege dogrudan yazilir, sonra yine
 * sunucudan tazelenir.
 */
export function useAddSessionExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, exerciseId }: { sessionId: number; exerciseId: number }): Promise<AcikOturum> => {
      const yanit = await request<SessionResponse>(`/sessions/${sessionId}/exercises`, {
        method: 'POST',
        body: JSON.stringify({ exerciseId }),
      });
      return dogrulanmisOturum(yanit);
    },
    onSuccess: (oturum) => {
      queryClient.setQueryData(queryKeys.openSession, oturum);
      void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
    },
  });
}

/**
 * `DELETE /api/sessions/{id}/exercises/{exerciseId}` (#60), govdesiz 204: hareket ve bu antrenmandaki
 * setleri gider. Hook degil duz fonksiyon: geri alma penceresi acikken sayfadan cikilirsa bilesen
 * kaldirildiktan sonra tamamlanir (bkz. `setiSil`). Sonrasinda `setDegistiTazele` yeterlidir.
 */
export async function hareketiKaldir(sessionId: number, exerciseId: number): Promise<void> {
  await request<void>(`/sessions/${sessionId}/exercises/${exerciseId}`, { method: 'DELETE' });
}

/** `DELETE /api/sessions/{id}`. Oturumu ve setlerini siler (Faz 7), govdesiz 204 doner. */
export async function oturumuSil(sessionId: number): Promise<void> {
  await request<void>(`/sessions/${sessionId}`, { method: 'DELETE' });
}

/**
 * Bir oturum silindikten SONRA tazelenecekler. Sunucu, silinen oturumun hareketlerinde
 * `RecordType`i yeniden hesaplar -- bu yuzden `records` ve hareket ilerlemesi de bayatlar.
 *
 * `exerciseProgressRoot` (tek bir hareket degil, KOK onek) invalidate edilir: 204 yaniti hangi
 * hareketlerin etkilendigini SOYLEMEZ, istemcide bunu bilmenin yolu yok. Silinen oturum bugunun
 * acik oturumuysa `openSession` da tazelenmeli -- cagiran taraf hangi durumda oldugunu bilmek
 * zorunda kalmasin diye kosulsuz invalidate edilir (KISS).
 *
 * `useDeleteSession`in DISINA acilir: geri alma penceresi acikken sayfadan cikilirsa silme,
 * bilesen kaldirildiktan sonra tamamlanir; o anda mutasyonun gozlemcisi artik yoktur ve
 * `onSuccess` CALISMAZ, ama tazeleme yine de yapilmalidir.
 */
export function oturumSilindiTazele(queryClient: QueryClient, sessionId: number): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
  void queryClient.invalidateQueries({ queryKey: queryKeys.historyAll });
  void queryClient.invalidateQueries({ queryKey: queryKeys.records });
  void queryClient.invalidateQueries({ queryKey: queryKeys.exerciseProgressRoot });
  void queryClient.invalidateQueries({ queryKey: queryKeys.calendarAll });
  // Silinen oturumun set sorgusu artik 404 verir; invalidate ETMEK yerine KALDIRILIR,
  // aksi halde bayat girdi yeniden cekilmeye calisilir ve gereksiz bir hata uretir.
  queryClient.removeQueries({ queryKey: queryKeys.sessionSets(sessionId) });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: oturumuSil,
    onSuccess: (_veri, sessionId) => oturumSilindiTazele(queryClient, sessionId),
  });
}

/**
 * `POST /api/sessions { templateId }`. Bugun acik oturum varsa sunucu onu 200 ile oldugu gibi doner
 * ve `templateId` UYGULANMAZ (Faz 7 karari) -- cagiran taraf donen oturumun `templateId`'sine bakar.
 */
export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: number): Promise<AcikOturum> => {
      const govde: StartSessionRequest = { templateId };
      const yanit = await request<SessionResponse>('/sessions', {
        method: 'POST',
        body: JSON.stringify(govde),
      });
      return dogrulanmisOturum(yanit);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
      void queryClient.invalidateQueries({ queryKey: queryKeys.historyAll });
    },
  });
}

export interface SablonHareketi {
  exerciseId: number;
  exerciseName: string;
  isArchived: boolean;
  plannedSets: number;
  restSeconds: number;
}

export interface Sablon {
  id: number;
  name: string;
  exercises: SablonHareketi[];
}

function dogrulanmisSablonHareketi(yanit: TemplateExerciseResponse): SablonHareketi {
  if (
    yanit.exerciseId === undefined ||
    !yanit.exerciseName ||
    yanit.isArchived === undefined ||
    yanit.plannedSets === undefined ||
    yanit.restSeconds === undefined
  ) {
    throw new Error('Sunucudan eksik sablon hareketi yaniti alindi.');
  }
  return {
    exerciseId: yanit.exerciseId,
    exerciseName: yanit.exerciseName,
    isArchived: yanit.isArchived,
    plannedSets: yanit.plannedSets,
    restSeconds: yanit.restSeconds,
  };
}

/** Hareketler sunucunun `orderIndex` sirasiyla gelir; istemci yeniden SIRALAMAZ. */
function dogrulanmisSablon(yanit: TemplateResponse): Sablon {
  if (yanit.id === undefined || !yanit.name) {
    throw new Error('Sunucudan eksik sablon yaniti alindi.');
  }
  return {
    id: yanit.id,
    name: yanit.name,
    exercises: (yanit.exercises ?? []).map(dogrulanmisSablonHareketi),
  };
}

export interface SablonGirdisi {
  name: string;
  // Sira dizideki konumdur; sunucu `OrderIndex`i buradan turetir (istemci gondermez).
  exercises: { exerciseId: number; plannedSets: number; restSeconds: number }[];
}

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: async (): Promise<Sablon[]> => {
      const yanit = await request<TemplateResponse[]>('/templates');
      return yanit.map(dogrulanmisSablon);
    },
  });
}

export function useTemplate(id: number | null) {
  return useQuery({
    queryKey: queryKeys.template(id ?? 0),
    queryFn: async (): Promise<Sablon> =>
      dogrulanmisSablon(await request<TemplateResponse>(`/templates/${id}`)),
    enabled: id !== null,
  });
}

function sablonGovdesi(girdi: SablonGirdisi): string {
  const govde: CreateTemplateRequest = { name: girdi.name, exercises: girdi.exercises };
  return JSON.stringify(govde);
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (girdi: SablonGirdisi): Promise<Sablon> =>
      dogrulanmisSablon(
        await request<TemplateResponse>('/templates', { method: 'POST', body: sablonGovdesi(girdi) }),
      ),
    onSuccess: (sablon) => {
      queryClient.setQueryData(queryKeys.template(sablon.id), sablon);
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    },
  });
}

/**
 * PUT ad ve hareket listesini BIRLIKTE degistirir (PATCH yalnizca ad). Acik oturum da tazelenir:
 * ilerleme ve dinlenme sureleri sunucuda sablondan canli okunur (spec Karar 8).
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, girdi }: { id: number; girdi: SablonGirdisi }): Promise<Sablon> =>
      dogrulanmisSablon(
        await request<TemplateResponse>(`/templates/${id}`, { method: 'PUT', body: sablonGovdesi(girdi) }),
      ),
    onSuccess: (sablon) => {
      queryClient.setQueryData(queryKeys.template(sablon.id), sablon);
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates });
      void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await request<void>(`/templates/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates });
      void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
    },
  });
}

export interface Yorum {
  id: number;
  content: string;
  createdAt: string;
}

/**
 * `AiInsightResponse`'un cogu alani (workoutSessionId, setEntryId, model, tokensUsed,
 * estimatedCostUsd) BILEREK burada YOK -- issue #76 Karar 4: maliyet bilgisi kullaniciya
 * gosterilmez, oturum/set bazli kapsam bu dilimde uretilmiyor (yalnizca tarih araligi).
 * Ihtiyac dogunca genisletilir.
 */
function dogrulanmisYorum(yanit: AiInsightResponse): Yorum {
  if (yanit.id === undefined || !yanit.content || !yanit.createdAt) {
    throw new Error('Sunucudan eksik yorum yaniti alindi.');
  }
  return { id: yanit.id, content: yanit.content, createdAt: yanit.createdAt };
}

export interface YorumSayfasi {
  items: Yorum[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

function dogrulanmisYorumSayfasi(yanit: AiInsightResponsePagedResponse): YorumSayfasi {
  if (
    yanit.page === undefined ||
    yanit.pageSize === undefined ||
    yanit.totalCount === undefined ||
    yanit.totalPages === undefined
  ) {
    throw new Error('Sunucudan eksik yorum sayfasi yaniti alindi.');
  }
  return {
    items: (yanit.items ?? []).map(dogrulanmisYorum),
    page: yanit.page,
    pageSize: yanit.pageSize,
    totalCount: yanit.totalCount,
    totalPages: yanit.totalPages,
  };
}

/** Sayfalama TAMAMEN sunucunun zarfindan surulur -- `useHistory` ile ayni desen (KISS). */
export function useInsights(page: number) {
  return useQuery({
    queryKey: queryKeys.insights(page),
    queryFn: async (): Promise<YorumSayfasi> => {
      const yanit = await request<AiInsightResponsePagedResponse>(`/insights?Page=${page}`);
      return dogrulanmisYorumSayfasi(yanit);
    },
  });
}

/**
 * `POST /api/insights`. Govde BILEREK gonderilmez: backend govdesiz istekte kendi varsayilanini
 * (son 30 gun) uygular (issue #76 Karar) -- istemci bu kurali TEKRARLAMAZ.
 *
 * `signal` cagiran tarafin AbortController'indan gelir (issue #76 Karar 3: "iptal edilebilir
 * bekleme"). DIKKAT -- bu SADECE istemcinin beklemeyi birakmasidir: backend, para harcanan LLM
 * cagrisini istemci koptugunda BILEREK durdurmaz (AiInsightService.GenerateAsync, saglayiciyi
 * `CancellationToken.None` ile cagirir) -- odenen bir yanit bosa gitmesin diye. Yani iptal
 * edilen bir istek bile YORUM ureterek gecmise eklenmis olabilir; arayuz bunu acikca soylemeli,
 * "iptal ettim, hicbir sey olmadi" izlenimi vermemeli.
 */
export function useGenerateInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (signal: AbortSignal): Promise<Yorum> =>
      dogrulanmisYorum(await request<AiInsightResponse>('/insights', { method: 'POST', signal })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.insightsAll });
    },
  });
}

export function useDeleteInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await request<void>(`/insights/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.insightsAll });
    },
  });
}
