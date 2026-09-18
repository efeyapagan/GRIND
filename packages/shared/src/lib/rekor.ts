import type { SetKaydi } from '../api/queries';

/**
 * PR rozeti dogrudan sunucunun `recordType`'indan cizilir -- rekor istemcide YENIDEN HESAPLANMAZ.
 * `None` icin rozet yok. Buyuk harf CSS ile gelir.
 */
export function rekorRozetiMetni(kayit: SetKaydi): string | null {
  if (kayit.recordType === 'Weight') {
    return 'Ağırlık rekoru';
  }
  if (kayit.recordType === 'Reps') {
    return 'Tekrar rekoru';
  }
  return null;
}
