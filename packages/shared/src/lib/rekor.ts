import type { SetKaydi } from '../api/queries';
import { i18n } from '../i18n/i18n';

/**
 * PR rozeti dogrudan sunucunun `recordType`'indan cizilir -- rekor istemcide YENIDEN HESAPLANMAZ.
 * `None` icin rozet yok. Buyuk harf CSS ile gelir.
 */
export function rekorRozetiMetni(kayit: SetKaydi): string | null {
  if (kayit.recordType === 'Weight') {
    return i18n.t('rekor.agirlik');
  }
  if (kayit.recordType === 'Reps') {
    return i18n.t('rekor.tekrar');
  }
  return null;
}
