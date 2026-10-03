import type {
  AcikOturum,
  EgzersizOlcumu,
  GecmisOturum,
  HareketIlerlemesi,
  Sablon,
  SetKaydi,
} from '@grind/shared/api/queries';

/**
 * #174 dilim 2: cevrimdisi islemlerin ekrana HEMEN yansimasi (iyimser onbellek guncellemesi). Kuyruk
 * gonderilince ilgili sorgular sunucudan tazelenir ve bu degerler sunucununkilerle degisir.
 *
 * KULLANICI KARARI (CLAUDE.md "istemci yeniden hesaplamaz" kuralina bilincli istisna): gonderilmeyi bekleyen
 * antrenmanin set sayaci, set sayisi, suresi ve hacmi cihazda hesaplanir -- internet cekmeyen salondaki
 * kullanici antrenmanini ve gelisimini gorebilsin. PR asla cihazda hesaplanmaz: rozet hic yoktur.
 */

/** Antrenmana sonradan eklenen hareketin varsayilan dinlenmesi (sunucudaki varsayilanla ayni). */
const VARSAYILAN_DINLENME_SN = 90;

export function baslatIyimser({
  oturumId,
  startedAt,
  sablon,
}: {
  oturumId: number;
  startedAt: string;
  sablon: Pick<Sablon, 'id' | 'name' | 'exercises'> | null;
}): AcikOturum {
  return {
    id: oturumId,
    startedAt,
    isOpen: true,
    durationSeconds: null,
    templateId: sablon?.id ?? null,
    templateName: sablon?.name ?? null,
    progress: (sablon?.exercises ?? []).map((hareket) => ({
      exerciseId: hareket.exerciseId,
      exerciseName: hareket.exerciseName,
      plannedSets: hareket.plannedSets,
      completedSets: 0,
      restSeconds: hareket.restSeconds,
    })),
  };
}

/** Cevrimdisi girilen setin kaydi: PR rozeti yok (`None`), dinlenme sunucudan gelene kadar bilinmiyor. */
export function yeniSetKaydi(girdi: {
  id: number;
  sessionId: number;
  exerciseId: number;
  exerciseName: string;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  durationSeconds: number | null;
  measurement: EgzersizOlcumu;
  createdAt: string;
}): SetKaydi {
  return {
    ...girdi,
    weight: girdi.weight ?? 0,
    exercisePosition: 0,
    recordType: 'None',
    restSeconds: null,
  };
}

function sayaciDegistir(oturum: AcikOturum, exerciseId: number, fark: number): HareketIlerlemesi[] {
  return oturum.progress.map((hareket) =>
    hareket.exerciseId === exerciseId
      ? { ...hareket, completedSets: Math.max(0, hareket.completedSets + fark) }
      : hareket,
  );
}

export function hareketEkleIyimser(
  oturum: AcikOturum,
  hareket: { exerciseId: number; exerciseName: string },
): AcikOturum {
  if (oturum.progress.some((mevcut) => mevcut.exerciseId === hareket.exerciseId)) {
    return oturum;
  }
  return {
    ...oturum,
    progress: [
      ...oturum.progress,
      { ...hareket, plannedSets: null, completedSets: 0, restSeconds: VARSAYILAN_DINLENME_SN },
    ],
  };
}

export function setEkleIyimser(
  oturum: AcikOturum,
  setler: SetKaydi[],
  set: SetKaydi,
): { oturum: AcikOturum; setler: SetKaydi[] } {
  const listeli = hareketEkleIyimser(oturum, { exerciseId: set.exerciseId, exerciseName: set.exerciseName });
  return {
    oturum: { ...listeli, progress: sayaciDegistir(listeli, set.exerciseId, 1) },
    setler: [...setler, set],
  };
}

export function setDuzeltIyimser(
  setler: SetKaydi[],
  duzeltme: { id: number; weight: number | null; reps: number | null; rir: number | null; durationSeconds: number | null },
): SetKaydi[] {
  return setler.map((set) =>
    set.id === duzeltme.id
      ? {
          ...set,
          // Sunucudaki gibi: `null` "degistirme" demektir.
          weight: duzeltme.weight ?? set.weight,
          reps: duzeltme.reps ?? set.reps,
          rir: duzeltme.rir ?? set.rir,
          durationSeconds: duzeltme.durationSeconds ?? set.durationSeconds,
        }
      : set,
  );
}

export function setSilIyimser(
  oturum: AcikOturum,
  setler: SetKaydi[],
  setId: number,
): { oturum: AcikOturum; setler: SetKaydi[] } {
  const silinen = setler.find((set) => set.id === setId);
  return {
    oturum: silinen ? { ...oturum, progress: sayaciDegistir(oturum, silinen.exerciseId, -1) } : oturum,
    setler: setler.filter((set) => set.id !== setId),
  };
}

export function hareketKaldirIyimser(
  oturum: AcikOturum,
  setler: SetKaydi[],
  exerciseId: number,
): { oturum: AcikOturum; setler: SetKaydi[] } {
  return {
    oturum: { ...oturum, progress: oturum.progress.filter((hareket) => hareket.exerciseId !== exerciseId) },
    setler: setler.filter((set) => set.exerciseId !== exerciseId),
  };
}

export function siralaIyimser(oturum: AcikOturum, exerciseIds: number[]): AcikOturum {
  const hareketler = new Map(oturum.progress.map((hareket) => [hareket.exerciseId, hareket]));
  return { ...oturum, progress: exerciseIds.flatMap((id) => hareketler.get(id) ?? []) };
}

/**
 * Cevrimdisi bitirilen antrenmanin gecmis karti (kullanici karari: gecmiste hemen gorunur). Gonderilince
 * gecmis sunucudan tazelenir ve bu ozet sunucunun kaydiyla degisir.
 */
export function gecmisOzeti(oturum: AcikOturum, setler: SetKaydi[], endedAt: string): GecmisOturum {
  return {
    sessionId: oturum.id,
    startedAt: oturum.startedAt,
    templateId: oturum.templateId,
    templateName: oturum.templateName,
    isVolumeRecord: false,
    totalVolume: setler.reduce((toplam, set) => toplam + set.weight * (set.reps ?? 0), 0),
    setCount: setler.length,
    durationSeconds: Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(oturum.startedAt)) / 1000)),
    sets: setler,
  };
}
