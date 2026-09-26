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

/**
 * #401: ayni antrenmanda sonradan gecilen rekor setlerinin id'leri. Yine sunucunun `recordType`'indan
 * turetilir (rekor yeniden hesaplanmaz): bir kilo rekorunu ayni hareketin SONRAKI kilo rekoru, bir
 * tekrar rekorunu ayni hareketin AYNI agirliktaki sonraki tekrar rekoru gecer. Sira setin zamanidir.
 */
export function gecilmisRekorIdleri(sets: SetKaydi[]): Set<number> {
  const zamanSirali = [...sets].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
  const sonRekor = new Map<string, number>();
  const gecilmis = new Set<number>();
  for (const kayit of zamanSirali) {
    if (kayit.recordType === 'None') continue;
    const anahtar =
      kayit.recordType === 'Weight' ? `${kayit.exerciseId}|W` : `${kayit.exerciseId}|R|${kayit.weight}`;
    const onceki = sonRekor.get(anahtar);
    if (onceki !== undefined) gecilmis.add(onceki);
    sonRekor.set(anahtar, kayit.id);
  }
  return gecilmis;
}
