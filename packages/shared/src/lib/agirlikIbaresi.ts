import type { EgzersizEkipmani } from '../api/queries';

/**
 * #413: dumbbell ve makine hareketlerinde "kg" kutusunun tek tarafin mi toplamin mi agirligini
 * istedigi belirsizdi. Ekipmandan katalog anahtarina eslemedir; ceviriyi cagiran yapar (`t(...)`),
 * boylece bu hesap i18n'e bagli olmadan test edilebilir.
 *
 * Yalnizca iki tur ibare gosterir: dumbbell TEK dumbbell'in agirligiyla, makine TOPLAM agirlikla
 * kaydedilir. Barbell/Cable/Bodyweight/Other'da ibare yoktur (barbell zaten toplam yazilir, kablo
 * makaralari tek yuk gosterir) -- her kutuya bir kelime koymak set girisini gurultulu yapardi.
 * `null`/`undefined` = ekipmani bilinmeyen hareket (kullanicinin kendi ekledigi): ibare yok.
 */
export function agirlikIbaresiAnahtari(
  ekipman: EgzersizEkipmani | null | undefined,
): 'setGirdisi.ibareTeki' | 'setGirdisi.ibareToplam' | null {
  if (ekipman === 'Dumbbell') {
    return 'setGirdisi.ibareTeki';
  }
  if (ekipman === 'Machine') {
    return 'setGirdisi.ibareToplam';
  }
  return null;
}
