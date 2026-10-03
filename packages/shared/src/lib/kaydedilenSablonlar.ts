import type { Sablon } from '../api/queries';

type AyrilanSablon = Pick<Sablon, 'id'> & Partial<Pick<Sablon, 'savedFromUsername' | 'lastUsedAt' | 'isPinned'>>;

function sonKullanim(sablon: AyrilanSablon): number {
  return sablon.lastUsedAt ? new Date(sablon.lastUsedAt).getTime() : 0;
}

/**
 * #467/#538: kendi sablonlari ile baskasindan kaydedilenleri ayirir. Kendi sablonlari sunucunun
 * sirasini (`OrderIndex`, kullanicinin surukleyerek kurdugu) korur; kaydedilenler once sabitlenenler,
 * sonra en son kullanilan basta dizilir. Antrenman sekmesindeki "Kaydedilenler" ile kaydedilenler
 * ekrani ayni sirayi buradan alir.
 *
 * `!savedFromUsername` (strict `=== null` DEGIL): eski/mock sablon nesnelerinde alan hic yoksa
 * (undefined) da kendi sablonu sayilmali.
 */
export function sablonlariAyir<T extends AyrilanSablon>(sablonlar: readonly T[]): { kendi: T[]; kaydedilen: T[] } {
  const kendi = sablonlar.filter((s) => !s.savedFromUsername);
  const kaydedilen = sablonlar
    .filter((s) => s.savedFromUsername)
    .sort((a, b) => Number(b.isPinned ?? false) - Number(a.isPinned ?? false) || sonKullanim(b) - sonKullanim(a));
  return { kendi, kaydedilen };
}
