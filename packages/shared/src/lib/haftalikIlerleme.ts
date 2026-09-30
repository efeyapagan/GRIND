import type { Egzersiz, EgzersizHacmi, EgzersizKategorisi, HaftalikIstatistik } from '../api/queries';

/** #184: hacim grafiginin araligi -- 1A son 4, 3A son 13 tamamlanmis hafta, Tum hepsi. */
export type HacimAraligi = '1a' | '3a' | 'tum';

const HAFTA_SAYISI: Record<HacimAraligi, number | null> = { '1a': 4, '3a': 13, tum: null };

/**
 * Hacim grafiginin haftalari. Sunucunun son satiri icinde bulunulan, henuz bitmemis haftadir: grafige
 * girerse Pazartesi gunu tek antrenmanla "Su anki" dusuk gorunur ve gerileme gibi okunur (spec Karar 3).
 * Bos gecmis haftalar (hacim 0) grafikte kalir.
 */
export function hacimHaftalari(haftalar: readonly HaftalikIstatistik[], aralik: HacimAraligi): HaftalikIstatistik[] {
  const tamamlanmis = haftalar.slice(0, -1);
  const sayi = HAFTA_SAYISI[aralik];
  return sayi === null ? tamamlanmis : tamamlanmis.slice(-sayi);
}

export const KAS_GRUPLARI: readonly EgzersizKategorisi[] = ['Push', 'Pull', 'Legs', 'Other'];

export interface KasGrubuSatiri {
  kategori: EgzersizKategorisi;
  set: number;
  /** Onceki haftaya gore; ilk haftada karsilastirilacak hafta yok, `null`. */
  fark: number | null;
}

function setSayisi(hafta: HaftalikIstatistik, kategori: EgzersizKategorisi): number {
  if (kategori === 'Push') return hafta.pushSets;
  if (kategori === 'Pull') return hafta.pullSets;
  if (kategori === 'Legs') return hafta.legsSets;
  return hafta.otherSets;
}

/** #184: `sira`daki haftanin dort kas grubu satiri (Push, Pull, Legs, Other sirasiyla). */
export function kasGrubuSatirlari(haftalar: readonly HaftalikIstatistik[], sira: number): KasGrubuSatiri[] {
  const hafta = haftalar[sira];
  const onceki = sira > 0 ? haftalar[sira - 1] : null;
  return KAS_GRUPLARI.map((kategori) => {
    const set = setSayisi(hafta, kategori);
    return { kategori, set, fark: onceki ? set - setSayisi(onceki, kategori) : null };
  });
}

/**
 * #184: 1RM kartinin acilistaki hareketi -- verilen hacim listesinde (son 90 gun) en cok set atilan kilolu
 * (`WeightReps`) hareket; esitlikte ada gore. Agirliksiz ve sureli harekette 1RM tahmini yoktur (#346).
 */
export function varsayilanBirTekrarHareketi(
  hacimler: readonly EgzersizHacmi[],
  egzersizler: readonly Egzersiz[],
): number | null {
  const kilolu = new Set(
    egzersizler.filter((e) => (e.measurement ?? 'WeightReps') === 'WeightReps').map((e) => e.id),
  );
  const aday = hacimler
    .filter((h) => kilolu.has(h.exerciseId))
    .sort((a, b) => b.setCount - a.setCount || a.exerciseName.localeCompare(b.exerciseName))[0];
  return aday?.exerciseId ?? null;
}
