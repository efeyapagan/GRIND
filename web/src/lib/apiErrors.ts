import { ApiError } from '../api/problem';

export interface ApiHatasiSonucu {
  genelHata: string | null;
  alanHatalari: Record<string, string>;
}

const VARSAYILAN_MESAJ = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';

/**
 * Bir formun catch bloğunda ApiError'ı ikiye ayırır: `fieldErrors` doluysa ilgili alanın
 * altına, yoksa `detail` formun üstüne (spec Karar 5). LoginPage ve RegisterPage'in ikisi de
 * aynı ayırma mantığına ihtiyaç duyduğu için tek yerde tutuluyor (DRY).
 *
 * Anahtar karşılaştırması case-insensitive yapılır: backend'in ValidationProblemDetails.Errors
 * sözlüğü CLR property adını (örn. "Username") taşır, biz burada küçük harfli HTML input
 * id'lerimizle ("username") eşleştiriyoruz.
 *
 * `ozelMesaj`, çağıran tarafın belirli bir durumu (örn. login'de 401) genel bir mesajla
 * ezmesine izin verir -- backend'in nötr 401'ini burada bilerek sabit bir metne çeviriyoruz.
 */
export function apiHatasiniAyir(
  hata: unknown,
  ozelMesaj?: (hata: ApiError) => string | null,
): ApiHatasiSonucu {
  if (!(hata instanceof ApiError)) {
    return { genelHata: VARSAYILAN_MESAJ, alanHatalari: {} };
  }

  const ozel = ozelMesaj?.(hata);
  if (ozel) {
    return { genelHata: ozel, alanHatalari: {} };
  }

  if (Object.keys(hata.fieldErrors).length > 0) {
    const alanHatalari: Record<string, string> = {};
    for (const [alan, mesajlar] of Object.entries(hata.fieldErrors)) {
      if (mesajlar.length > 0) {
        alanHatalari[alan.toLowerCase()] = mesajlar[0];
      }
    }
    return { genelHata: null, alanHatalari };
  }

  return { genelHata: hata.detail, alanHatalari: {} };
}
