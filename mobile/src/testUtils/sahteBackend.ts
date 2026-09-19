import { ApiError } from '@grind/shared/api/problem';

/**
 * Dokunma testleri icin bellek-tabanli sahte backend (issue: "dokunma testleri" istegi).
 * Gercek `request()` yerine gecer -- ekranlar GERCEK Expo Router navigasyonuyla, GERCEK
 * bilesenleriyle calisir; yalnizca ag katmani sahte. Web'in MSW ile yaptigi isin RN
 * karsiligi -- burada elle, kucuk bir switch olarak (MSW'nin RN'de kurulumu ek risk tasirdi,
 * bu kucuk yuzeyde gerek yoktu).
 */
export function sahteBackendOlustur() {
  const EGZERSIZ = { id: 1, name: 'Bench Press', category: 'Push', isArchived: false };

  const state = {
    sablonlar: [] as any[],
    acikOturum: null as any,
    setler: [] as any[],
    siradakiSablonId: 1,
    siradakiSetId: 1,
    siradakiOturumId: 1,
  };

  async function sahteRequest(path: string, init: RequestInit & Record<string, unknown> = {}): Promise<unknown> {
    const method = (init.method as string | undefined) ?? 'GET';
    const govde = init.body ? JSON.parse(init.body as string) : undefined;

    if (method === 'GET' && path === '/exercises') {
      return [EGZERSIZ];
    }

    if (method === 'GET' && path === '/templates') {
      return state.sablonlar;
    }

    if (method === 'POST' && path === '/templates') {
      const yeni = {
        id: state.siradakiSablonId++,
        name: govde.name,
        createdAt: new Date().toISOString(),
        exercises: (govde.exercises as any[]).map((h, sira) => ({
          id: sira + 1,
          exerciseId: h.exerciseId,
          exerciseName: EGZERSIZ.name,
          category: EGZERSIZ.category,
          isArchived: false,
          orderIndex: sira,
          plannedSets: h.plannedSets,
          restSeconds: h.restSeconds,
        })),
      };
      state.sablonlar.push(yeni);
      return yeni;
    }

    if (method === 'GET' && path === '/sessions/open') {
      if (!state.acikOturum) {
        throw new ApiError(404, 'Açık oturum yok');
      }
      return state.acikOturum;
    }

    if (method === 'GET' && /^\/sessions\/\d+\/sets$/.test(path)) {
      return state.setler;
    }

    if (method === 'POST' && path === '/sessions') {
      const sablon = state.sablonlar.find((s) => s.id === govde.templateId);
      state.acikOturum = {
        id: state.siradakiOturumId++,
        startedAt: new Date().toISOString(),
        endedAt: null,
        isOpen: true,
        templateId: sablon.id,
        templateName: sablon.name,
        progress: sablon.exercises.map((h: any) => ({
          exerciseId: h.exerciseId,
          exerciseName: h.exerciseName,
          plannedSets: h.plannedSets,
          completedSets: 0,
          restSeconds: h.restSeconds,
        })),
      };
      return state.acikOturum;
    }

    if (method === 'POST' && path === '/sets') {
      const yeniSet = {
        id: state.siradakiSetId++,
        sessionId: state.acikOturum.id,
        exerciseId: govde.exerciseId,
        exerciseName: EGZERSIZ.name,
        weight: govde.weight,
        reps: govde.reps,
        recordType: 'Weight',
        rir: govde.rir ?? null,
        createdAt: new Date().toISOString(),
        restSeconds: null,
      };
      state.setler.push(yeniSet);
      const hareket = state.acikOturum.progress.find((h: any) => h.exerciseId === govde.exerciseId);
      if (hareket) {
        hareket.completedSets += 1;
      }
      return yeniSet;
    }

    if (method === 'GET' && path.startsWith('/stats/calendar')) {
      return {
        days: [],
        trainedDayCount: 0,
        currentWeekStreak: 0,
        longestWeekStreak: 0,
        thisWeekTrainedDays: 0,
        weeklyTargetDays: null,
        currentTargetStreak: null,
      };
    }

    if (method === 'GET' && path === '/records') {
      return [];
    }

    if (method === 'GET' && path.startsWith('/history')) {
      return { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 1 };
    }

    throw new Error(`Sahte backend: eşleşmeyen istek ${method} ${path}`);
  }

  return { sahteRequest, state };
}
