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

/**
 * Antrenman bir sablonla baslamis olsa bile, sablonda OLMAYAN bir hareket eklendiyse listesi artik
 * o sablonu yansitmaz -- bitirirken "yeni bir sablon olarak kaydedilsin mi?" diye sorulur.
 *
 * Yalnizca EKLEME sayilir: sablondaki bir hareketi atlamak (ya da kaldirmak) yeni bir sablon
 * istegi anlamina gelmez -- o gun o hareketi yapmamis olmak sablonu degistirmez.
 */
export function sablondaOlmayanHareketVarMi(
  ilerleme: readonly HareketIlerlemesi[],
  sablonHareketleri: readonly { exerciseId: number }[],
): boolean {
  const sablondakiler = new Set(sablonHareketleri.map((hareket) => hareket.exerciseId));
  return ilerleme.some((hareket) => !sablondakiler.has(hareket.exerciseId));
}
