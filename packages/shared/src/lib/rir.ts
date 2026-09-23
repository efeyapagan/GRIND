import { i18n } from '../i18n/i18n';

/**
 * RIR kaydiricisi (#266) -- web ve mobil kaydirici ile set haplari ayni hesabi kullanir. On durak
 * rayda ESIT aralikli: tam sayilar, aralarindaki "X–Y arasi" (yarim adim olarak saklanir, 2–3 = 2.5)
 * ve en sagda "4+" (= 5). Sunucu 0–5 ve yarim adim disini reddeder; #266 oncesi kayitlarda 5'ten
 * buyuk RIR olabilir, onlar "4+" sayilir. Sunucu karsiligi: `ExportTextFormatter.RirText`.
 */
export const RIR_DURAKLARI: readonly number[] = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5];

const EN_UST = RIR_DURAKLARI[RIR_DURAKLARI.length - 1];

/** Degerin durak sirasi (0–9); 5 ve ustu son durak. */
export function rirDurakSirasi(rir: number): number {
  const sira = RIR_DURAKLARI.indexOf(Math.min(rir, EN_UST));
  return sira === -1 ? RIR_DURAKLARI.length - 1 : sira;
}

/** 2 → "2", 2.5 → "2–3", 5 ve ustu → "4+". */
export function rirEtiketi(rir: number): string {
  if (rir >= EN_UST) {
    return '4+';
  }
  const tam = Math.floor(rir);
  return rir === tam ? String(tam) : `${tam}–${tam + 1}`;
}

/** Raydaki konum orani (0 = sol uc, 1 = sag uc) → en yakin duragin degeri. Ray disi uca duser. */
export function enYakinRirDegeri(oran: number): number {
  const sonSira = RIR_DURAKLARI.length - 1;
  const sira = Math.round(Math.min(Math.max(oran, 0), 1) * sonSira);
  return RIR_DURAKLARI[sira];
}

/** Durak basligi ("2–3 arası.") ve cumlesi -- kaydiricinin altinda ve `aria-valuetext`te. */
export function rirAciklamasi(rir: number): { baslik: string; cumle: string } {
  // Katalog anahtarlari tipli: sira 0–9 oldugu icin `d${sira}` her zaman var olan bir anahtardir.
  const durak = `d${rirDurakSirasi(rir)}` as `d${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;
  return {
    baslik: i18n.t(`rir.durakBasligi.${durak}`),
    cumle: i18n.t(`rir.durakCumlesi.${durak}`),
  };
}
