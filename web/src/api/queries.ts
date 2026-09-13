import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './client';
import { ApiError } from './problem';
import type { components } from './schema';

type SessionResponse = components['schemas']['SessionResponse'];
type SetEntryResponse = components['schemas']['SetEntryResponse'];
type ExerciseResponse = components['schemas']['ExerciseResponse'];
type CreateSetRequest = components['schemas']['CreateSetRequest'];
type HistorySessionResponse = components['schemas']['HistorySessionResponse'];
type HistorySessionResponsePagedResponse = components['schemas']['HistorySessionResponsePagedResponse'];
type ExerciseRecordResponse = components['schemas']['ExerciseRecordResponse'];
type TemplateResponse = components['schemas']['TemplateResponse'];
type TemplateExerciseResponse = components['schemas']['TemplateExerciseResponse'];
type CreateTemplateRequest = components['schemas']['CreateTemplateRequest'];
type SessionProgressResponse = components['schemas']['SessionProgressResponse'];
type StartSessionRequest = components['schemas']['StartSessionRequest'];

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
  templates: ['templates'] as const,
  // BILEREK `templates`in oneki DEGIL: liste invalidate edilince acik duzenleyicinin detayi yeniden
  // cekilmesin (silmeden hemen sonra 404'e dusmesin).
  template: (id: number) => ['template', id] as const,
  exerciseHistory: (exerciseId: number) => ['exerciseHistory', exerciseId] as const,
};

export interface HareketIlerlemesi {
  exerciseId: number;
  exerciseName: string;
  plannedSets: number;
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
}

export interface Egzersiz {
  id: number;
  name: string;
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
  };
}

function dogrulanmisEgzersiz(yanit: ExerciseResponse): Egzersiz {
  if (yanit.id === undefined || !yanit.name) {
    throw new Error('Sunucudan eksik egzersiz yaniti alindi.');
  }
  return { id: yanit.id, name: yanit.name };
}

export interface GecmisOturum {
  sessionId: number;
  startedAt: string;
  templateName: string | null;
  totalVolume: number;
  setCount: number;
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
 * Bir hareketin son 10 oturumu (spec Karar 9). Egzersiz filtresi verildiginde sunucu her oturumun
 * `totalVolume`/`setCount`'unu YALNIZCA o egzersizin setlerinden hesaplar -- istemci toplamaz.
 * Acik bugunku oturum da (o harekete set girildiyse) listededir.
 */
export function useExerciseHistory(exerciseId: number | null) {
  return useQuery({
    queryKey: queryKeys.exerciseHistory(exerciseId ?? 0),
    queryFn: async (): Promise<GecmisOturum[]> => {
      const yanit = await request<HistorySessionResponsePagedResponse>(
        `/history?ExerciseId=${exerciseId}&PageSize=10`,
      );
      return dogrulanmisGecmisSayfasi(yanit).items;
    },
    enabled: exerciseId !== null,
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
    onSuccess: (set) => {
      // Set hangi oturuma dustu yanittaki sessionId'den bilinir -- acik oturum, o oturumun
      // setleri ve rekorlar (Task 5'te kullanilacak) invalidate edilir (spec).
      void queryClient.invalidateQueries({ queryKey: queryKeys.openSession });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSets(set.sessionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.records });
      // Yeni set gecmisteki set sayisini/hacmini ve sayfa 1'in icerigini de degistirebilir
      // (review bulgusu M1) -- `historyAll` ONEKI ile invalidate etmek TUM sayfalari kapsar.
      void queryClient.invalidateQueries({ queryKey: queryKeys.historyAll });
      // Bugunku cubuk buyusun (spec Karar 9): yalnizca eklenen setin hareketi.
      void queryClient.invalidateQueries({ queryKey: queryKeys.exerciseHistory(set.exerciseId) });
    },
  });
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
