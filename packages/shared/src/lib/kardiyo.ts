import type { KardiyoAlani, KardiyoDegerleri, KardiyoKaydi } from '../api/queries';
import type { Dil } from '../i18n/dil';
import { formatSayi, gecenSureMetni } from './format';

/**
 * #647: kardiyo kutularinin istemci kurallari. Hangi kutunun soruldugu hareketin `cardioFields`'indan gelir
 * (sunucu, makineye ozel); burada yalnizca kutunun ne zaman soruldugu, kayittaki kolonu, araligi ve gosterimi.
 */

/** Baslamadan once girilen ayarlar; gerisi Durdur'dan sonra girilen sonuclar. */
const AYARLAR: readonly KardiyoAlani[] = ['Speed', 'Incline', 'Level', 'Damper'];

/** Ozet ve form sirasi: once mesafe (en cok bakilan), sonra ayarlar, sonra diger sonuclar. */
const SIRA: readonly KardiyoAlani[] = [
  'Distance', 'Speed', 'Incline', 'Level', 'Damper', 'Cadence', 'Floors', 'Steps', 'Jumps', 'Watts',
];

export const KOLONLAR: Record<KardiyoAlani, keyof KardiyoDegerleri> = {
  Speed: 'speedKmh',
  Incline: 'inclinePercent',
  Level: 'level',
  Damper: 'damper',
  Distance: 'distanceKm',
  Cadence: 'cadence',
  Floors: 'floors',
  Steps: 'steps',
  Jumps: 'jumps',
  Watts: 'watts',
};

/** Sunucudaki DTO araliklariyla ayni; `ondalik` false ise tam sayi. Mesafe km cinsindendir. */
const ARALIKLAR: Record<KardiyoAlani, { en: number; cok: number; ondalik: boolean }> = {
  Speed: { en: 0.1, cok: 40, ondalik: true },
  Incline: { en: 0, cok: 40, ondalik: true },
  Level: { en: 1, cok: 30, ondalik: false },
  Damper: { en: 1, cok: 10, ondalik: false },
  Distance: { en: 0.001, cok: 200, ondalik: true },
  Cadence: { en: 1, cok: 300, ondalik: false },
  Floors: { en: 1, cok: 1000, ondalik: false },
  Steps: { en: 1, cok: 100000, ondalik: false },
  Jumps: { en: 1, cok: 100000, ondalik: false },
  Watts: { en: 1, cok: 2000, ondalik: false },
};

export const BOS_KARDIYO_DEGERLERI: KardiyoDegerleri = {
  speedKmh: null,
  inclinePercent: null,
  level: null,
  damper: null,
  distanceKm: null,
  cadence: null,
  floors: null,
  steps: null,
  jumps: null,
  watts: null,
};

function sirala(alanlar: readonly KardiyoAlani[]): KardiyoAlani[] {
  return SIRA.filter((alan) => alanlar.includes(alan));
}

export function ayarAlanlari(alanlar: readonly KardiyoAlani[]): KardiyoAlani[] {
  return sirala(alanlar).filter((alan) => AYARLAR.includes(alan));
}

export function sonucAlanlari(alanlar: readonly KardiyoAlani[]): KardiyoAlani[] {
  return sirala(alanlar).filter((alan) => !AYARLAR.includes(alan));
}

/** Kurek ve kayak ergometresi mesafeyi metre gosterir. Alan seti belirler (damper + mesafe), makine adi degil. */
export function metreMi(alanlar: readonly KardiyoAlani[]): boolean {
  return alanlar.includes('Damper') && alanlar.includes('Distance');
}

/** Akan kayitta baslangictan bu yana, bitmiste kaydin suresi: "20:00", "1:05:00". */
export function kardiyoSureMetni(kayit: Pick<KardiyoKaydi, 'startedAt' | 'durationSeconds'>, simdiMs: number): string {
  return gecenSureMetni(
    kayit.durationSeconds !== null ? kayit.durationSeconds * 1000 : simdiMs - Date.parse(kayit.startedAt),
  );
}

/** Ozetin bir parcasi: `kardiyo.ozet.<anahtar>` metnine `deger` verilir. */
export interface OzetParcasi {
  anahtar: KardiyoAlani | 'DistanceMetre';
  deger: string;
}

/** Kaydin dolu kutulari, sabit sirayla ve dile gore bicimli -- metni cagiran `t` ile kurar. */
export function kardiyoOzetParcalari(kayit: KardiyoDegerleri, metre: boolean, dil: Dil): OzetParcasi[] {
  return SIRA.flatMap((alan): OzetParcasi[] => {
    const deger = kayit[KOLONLAR[alan]];
    if (deger === null) {
      return [];
    }
    if (alan === 'Distance' && metre) {
      return [{ anahtar: 'DistanceMetre', deger: formatSayi(Math.round(deger * 1000), dil, 0) }];
    }
    return [{ anahtar: alan, deger: formatSayi(deger, dil, alan === 'Distance' ? 3 : 1) }];
  });
}

export type KardiyoGirdisi = Partial<Record<KardiyoAlani, string>>;

/** Kayittaki degerleri forma yazar (duzeltme formu). Metre gosterilen mesafe metre olarak yazilir. */
export function kardiyoGirdisi(kayit: KardiyoDegerleri, alanlar: readonly KardiyoAlani[], metre: boolean): KardiyoGirdisi {
  return Object.fromEntries(
    alanlar.map((alan) => {
      const deger = kayit[KOLONLAR[alan]];
      if (deger === null) return [alan, ''];
      return [alan, String(alan === 'Distance' && metre ? Math.round(deger * 1000) : deger)];
    }),
  );
}

/**
 * Formu degerlere cevirir: bos kutu `null`, virgul ondalik ayraci kabul edilir, metre gosterilen mesafe km'ye
 * cevrilir. Aralik disi ya da tam sayi olmasi gerekirken ondalikli kutular `hatalar`da doner.
 */
export function kardiyoGirdisiniAyristir(
  girdi: KardiyoGirdisi,
  alanlar: readonly KardiyoAlani[],
  metre: boolean,
): { degerler: KardiyoDegerleri; hatalar: KardiyoAlani[] } {
  const degerler: KardiyoDegerleri = { ...BOS_KARDIYO_DEGERLERI };
  const hatalar: KardiyoAlani[] = [];
  for (const alan of alanlar) {
    const metin = (girdi[alan] ?? '').trim().replace(',', '.');
    if (metin === '') continue;
    const sayi = Number(metin);
    const deger = alan === 'Distance' && metre ? sayi / 1000 : sayi;
    const { en, cok, ondalik } = ARALIKLAR[alan];
    if (!Number.isFinite(sayi) || deger < en || deger > cok || (!ondalik && !Number.isInteger(sayi))) {
      hatalar.push(alan);
      continue;
    }
    degerler[KOLONLAR[alan]] = deger;
  }
  return { degerler, hatalar };
}

/** Sure kutulari (dakika + saniye) -> saniye; bos ya da 1 sn–4 saat disi `null` (sunucudaki aralik). */
export function kardiyoSuresiniAyristir(dakika: string, saniye: string): number | null {
  const dk = dakika.trim() === '' ? 0 : Number(dakika);
  const sn = saniye.trim() === '' ? 0 : Number(saniye);
  if (!Number.isInteger(dk) || !Number.isInteger(sn) || dk < 0 || sn < 0 || sn > 59) {
    return null;
  }
  const toplam = dk * 60 + sn;
  return toplam >= 1 && toplam <= 14400 ? toplam : null;
}
