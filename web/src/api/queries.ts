import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './client';
import { ApiError } from './problem';
import type { components } from './schema';

type SessionResponse = components['schemas']['SessionResponse'];
type SetEntryResponse = components['schemas']['SetEntryResponse'];
type ExerciseResponse = components['schemas']['ExerciseResponse'];
type CreateSetRequest = components['schemas']['CreateSetRequest'];

/**
 * Sorgu anahtarlari TEK bir yerde tutulur (spec) -- Task 5'teki `useRecords()` de ayni
 * `records` anahtarini kullanacak, set eklendikten sonra burasi invalidate edilir ki
 * "tum zamanlarin rekorlari" ekrani bayat kalmasin.
 */
export const queryKeys = {
  openSession: ['openSession'] as const,
  sessionSets: (sessionId: number | null) => ['sessionSets', sessionId] as const,
  exercises: ['exercises'] as const,
  records: ['records'] as const,
};

export interface AcikOturum {
  id: number;
  startedAt: string;
  isOpen: boolean;
  templateName: string | null;
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
function dogrulanmisOturum(yanit: SessionResponse): AcikOturum {
  if (yanit.id === undefined || !yanit.startedAt || yanit.isOpen === undefined) {
    throw new Error('Sunucudan eksik oturum yaniti alindi.');
  }
  return {
    id: yanit.id,
    startedAt: yanit.startedAt,
    isOpen: yanit.isOpen,
    templateName: yanit.templateName ?? null,
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
