import { ApiError, VARSAYILAN_MESAJ } from '../api/problem';

export interface ApiHatasiSonucu {
  genelHata: string | null;
  alanHatalari: Record<string, string>;
}

/**
 * Bir formun catch bloğunda ApiError'ı ikiye ayırır: `fieldErrors` doluysa ilgili alanın
 * altına, yoksa `detail` formun üstüne (spec Karar 5). LoginPage, RegisterPage ve AddSetForm'un
 * üçü de aynı ayırma mantığına ihtiyaç duyduğu için tek yerde tutuluyor (DRY).
 *
 * Anahtar karşılaştırması case-insensitive yapılır: backend'in ValidationProblemDetails.Errors
 * sözlüğü CLR property adını (örn. "Username") taşır, biz burada küçük harfli HTML input
 * id'lerimizle ("username") eşleştiriyoruz.
 *
 * `bilinenAlanlar`, çağıran formun GERÇEKTEN render ettiği alan adlarını (küçük/büyük harf
 * duyarsız) verir -- bu yardımcı hangi alanların bir form tarafından gösterildiğini kendi
 * başına bilemez. `fieldErrors`teki hiçbir anahtar bu listeyle eşleşmezse (örn. sunucu
 * `$.reps` gibi deserializasyon anahtarları döndürdüğünde), sessizce hiçbir şey göstermek
 * yerine sunucunun `detail`/`title`'ini genel bir `role="alert"` hatası olarak gösteririz
 * (review bulgusu I3) -- aksi halde kullanıcı "Ekle"ye basar ve hiçbir şey olmaz.
 *
 * `ozelMesaj`, çağıran tarafın belirli bir durumu (örn. login'de 401) genel bir mesajla
 * ezmesine izin verir -- backend'in nötr 401'ini burada bilerek sabit bir metne çeviriyoruz.
 */
export function apiHatasiniAyir(
  hata: unknown,
  bilinenAlanlar: readonly string[],
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
    const bilinenAlanlarKucuk = new Set(bilinenAlanlar.map((alan) => alan.toLowerCase()));
    const alanHatalari: Record<string, string> = {};
    for (const [alan, mesajlar] of Object.entries(hata.fieldErrors)) {
      const alanKucuk = alan.toLowerCase();
      if (mesajlar.length > 0 && bilinenAlanlarKucuk.has(alanKucuk)) {
        alanHatalari[alanKucuk] = mesajlar[0];
      }
    }

    if (Object.keys(alanHatalari).length > 0) {
      return { genelHata: null, alanHatalari };
    }

    // Hicbir anahtar formun render ettigi bir alanla eslesmedi -- sessiz kalmak yerine
    // sunucunun detail/title'ini genel hata olarak goster.
    return { genelHata: hata.detail, alanHatalari: {} };
  }

  return { genelHata: hata.detail, alanHatalari: {} };
}
