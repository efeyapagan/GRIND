import type { HareketIlerlemesi } from '../api/queries';

/**
 * Spec Karar 5: varsayilan secim `completedSets < plannedSets` olan ilk hareket, hepsi tamamsa ilk
 * hareket; sablonsuz oturumda secim yok (null). Karsilastirilan sayilar sunucunundur.
 */
export function varsayilanHareket(ilerleme: readonly HareketIlerlemesi[]): number | null {
  if (ilerleme.length === 0) {
    return null;
  }
  return (ilerleme.find((hareket) => hareket.completedSets < hareket.plannedSets) ?? ilerleme[0]).exerciseId;
}
