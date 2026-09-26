import type { components } from '../api/schema';

export type ArkadasHaftasi = components['schemas']['FriendWeeklyResponse'];

/**
 * Arkadas karsilastirmasinin sirasi (#418). Sunucu SIRALAMAZ: "hedefe ulasma orani" ve hedefsiz
 * satirlarin nereye dusecegi arayuz kararidir, bu yuzden hesap burada ve testli.
 *
 * Kullanici karari: hedefi olmayan arkadas listede KALIR ama hedefi olanlardan SONRA gelir --
 * orani olmayan biri, orani dusuk olanin ustune cikmamali.
 */
export function hedefOrani(arkadas: ArkadasHaftasi): number | null {
  const hedef = arkadas.weeklyTargetDays;
  if (hedef === null || hedef === undefined || hedef <= 0) {
    return null;
  }
  // Hedefi ASMAK orani 1'in ustune cikarmaz: cubuk tasmaz ve siralama "kim daha cok asti"ya donmez.
  return Math.min(1, (arkadas.trainedDaysThisWeek ?? 0) / hedef);
}

/**
 * Yuksek orandan dusuge; esitlikte daha cok gun yapan ustte, o da esitse ada gore alfabetik
 * (sira kararli kalsin diye). Hedefsizler blok halinde en sonda, kendi aralarinda gun sayisina gore.
 */
export function arkadaslariSirala(arkadaslar: readonly ArkadasHaftasi[]): ArkadasHaftasi[] {
  return [...arkadaslar].sort((a, b) => {
    const oranA = hedefOrani(a);
    const oranB = hedefOrani(b);

    if (oranA === null && oranB !== null) return 1;
    if (oranA !== null && oranB === null) return -1;
    if (oranA !== null && oranB !== null && oranA !== oranB) return oranB - oranA;

    const gunA = a.trainedDaysThisWeek ?? 0;
    const gunB = b.trainedDaysThisWeek ?? 0;
    if (gunA !== gunB) return gunB - gunA;

    return (a.username ?? '').localeCompare(b.username ?? '');
  });
}
