import type { EgzersizOlcumu } from '../api/queries';
import type { Dil } from '../i18n/dil';
import { i18n } from '../i18n/i18n';
import { kalanSureMetni } from './dinlenme';
import { formatWeight } from './format';

/** Bir setin gosterim icin gereken alanlari -- set kaydi da bildirimdeki rekor satiri da bunu tasir. */
export interface SetDegerAlanlari {
  weight: number;
  reps: number | null;
  durationSeconds: number | null;
  measurement: EgzersizOlcumu;
}

/**
 * #346: bir set uc bicimde yazilir. Sure onceliklidir: tip #346'yla sureliye donen hareketin (Plank) suresiz
 * eski setleri eskisi gibi "kg × tekrar" gorunur. Agirliksiz harekette 0 kg yazilmaz, ek agirlik varsa
 * "+5 kg" olarak one eklenir.
 */
export type SetDegeri =
  | { tur: 'sure'; sure: string }
  | { tur: 'tekrar'; tekrar: number; ekAgirlik: number | null }
  | { tur: 'agirlik'; agirlik: number; tekrar: number };

export function setDegeri(set: SetDegerAlanlari): SetDegeri {
  if (set.durationSeconds !== null) {
    return { tur: 'sure', sure: kalanSureMetni(set.durationSeconds * 1000) };
  }
  const tekrar = set.reps ?? 0;
  if (set.measurement === 'Reps') {
    return { tur: 'tekrar', tekrar, ekAgirlik: set.weight > 0 ? set.weight : null };
  }
  return { tur: 'agirlik', agirlik: set.weight, tekrar };
}

/** Duz metin: "60 kg × 8", "20 tekrar", "+5 kg × 20", "1:15" -- erisilebilirlik etiketleri ve bildirimler icin. */
export function setDegeriMetni(set: SetDegerAlanlari, dil: Dil): string {
  const deger = setDegeri(set);
  if (deger.tur === 'sure') {
    return deger.sure;
  }
  if (deger.tur === 'tekrar') {
    return deger.ekAgirlik === null
      ? i18n.t('rekorlar.tekrarSayisi', { count: deger.tekrar })
      : `+${formatWeight(deger.ekAgirlik, dil)} kg × ${deger.tekrar}`;
  }
  return `${formatWeight(deger.agirlik, dil)} kg × ${deger.tekrar}`;
}
