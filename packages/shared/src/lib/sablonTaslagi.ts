import type { HareketIlerlemesi } from '../api/queries';

/** Sablon formunda yeni satirin hedef seti -- web ve mobil form ayni degerle baslar. */
export const VARSAYILAN_HEDEF_SET = 3;

/** Sablon formunun baslangic satiri (#209/#186): antrenmandan gelen, henuz kaydedilmemis hareket. */
export interface SablonTaslakHareketi {
  exerciseId: number;
  exerciseName: string;
  plannedSets: number;
  restSeconds: number;
}

/**
 * Antrenmanin hareket listesini (SessionExercise, bir PLAN) sablon formunun baslangic satirlarina
 * cevirir. Hedefsiz hareket (antrenmana sonradan eklenen, `plannedSets = null`) formun yeni satir
 * varsayilanini alir: gerceklesen set sayisi hedef YAPILMAZ -- plan ile performans karismaz. Kullanici
 * degeri formda gorup duzeltir; kaydetmeyi `POST /api/templates` dogrular.
 */
export function oturumdanSablonHareketleri(ilerleme: readonly HareketIlerlemesi[]): SablonTaslakHareketi[] {
  return ilerleme.map((hareket) => ({
    exerciseId: hareket.exerciseId,
    exerciseName: hareket.exerciseName,
    plannedSets: hareket.plannedSets ?? VARSAYILAN_HEDEF_SET,
    restSeconds: hareket.restSeconds,
  }));
}
