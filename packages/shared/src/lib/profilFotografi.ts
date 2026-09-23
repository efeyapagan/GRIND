import type { Dil } from '../i18n/dil';

/**
 * Profil fotoğrafı yüklenmeden önce istemcide küçültülür (#283): kare, bu kenar uzunluğunda JPEG.
 * Sunucunun 256 KB sınırının (#280) çok altında kalır ve başlıktaki daireye yeter.
 */
export const PROFIL_FOTOGRAFI_KENARI = 256;

/** Görselin ortasından en büyük kare -- dikey fotoğrafta yüz genelde ortadadır. */
export function kareKirpma(genislik: number, yukseklik: number): { x: number; y: number; kenar: number } {
  const kenar = Math.min(genislik, yukseklik);
  return { x: Math.round((genislik - kenar) / 2), y: Math.round((yukseklik - kenar) / 2), kenar };
}

const BUYUK_HARF_YERELI: Record<Dil, string> = { tr: 'tr-TR', en: 'en-US' };

/** Fotoğraf yokken dairede gösterilen harf; büyük harf kuralı arayüz dilininki ('i' -> 'İ'). */
export function basHarf(ad: string, dil: Dil): string {
  const ilk = Array.from(ad.trim())[0] ?? '';
  return ilk.toLocaleUpperCase(BUYUK_HARF_YERELI[dil]);
}
