import type { HareketIlerlemesi } from '../api/queries';

/**
 * Spec Karar 5: varsayilan secim `completedSets < plannedSets` olan ilk hareket, hepsi tamamsa ilk
 * hareket; hareket listesi bossa secim yok (null). Karsilastirilan sayilar sunucunundur. Hedefsiz bir
 * hareket (#62, `plannedSets = null`) "tamamlanmamis" SAYILMAZ: karsilastiracak hedefi yok.
 *
 * `secilebilirIdler`: `GET /api/exercises` arsivlenmis egzersizleri DONDURMEZ, ama `progress` arsivlenmis
 * bir hareketi HALA icerebilir (review bulgusu F1) -- boyle bir hareket varsayilan secim olursa panel
 * gecersiz bir harekete saplanir. Bu yuzden varsayilan yalnizca `secilebilirIdler` icindeki hareketler
 * arasindan secilir; hicbiri uygun degilse null donulur (cagiran taraf alfabetik ilk egzersize duser,
 * bkz. TodayPage).
 */
export function varsayilanHareket(
  ilerleme: readonly HareketIlerlemesi[],
  secilebilirIdler: ReadonlySet<number>,
): number | null {
  const secilebilirIlerleme = ilerleme.filter((hareket) => secilebilirIdler.has(hareket.exerciseId));
  if (secilebilirIlerleme.length === 0) {
    return null;
  }
  return (
    secilebilirIlerleme.find(
      (hareket) => hareket.plannedSets !== null && hareket.completedSets < hareket.plannedSets,
    ) ?? secilebilirIlerleme[0]
  ).exerciseId;
}

/** Hareketin hedef set sayisi doldu mu -- hedefsiz hareket (`plannedSets = null`) hicbir zaman dolmaz. */
export function hedefTamamlandi(hareket: HareketIlerlemesi): boolean {
  return hareket.plannedSets !== null && hareket.completedSets >= hareket.plannedSets;
}
