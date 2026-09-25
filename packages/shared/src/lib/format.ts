import type { Dil } from '../i18n/dil';

/**
 * Turkiye 2016'dan beri yaz saati uygulamiyor (sabit UTC+3), ama zaman dilimini yine de
 * cihazin ayarina degil acikca 'Europe/Istanbul'a baglıyoruz -- aksi halde bu fonksiyonlar
 * calistigi makinenin/CI'in yerel saatine bagli, kararsiz sonuclar uretir.
 */
const TR_ZAMAN_DILIMI = 'Europe/Istanbul';

function tarihParcalariniAl(iso: string): { gun: string; ay: string; yil: string } {
  const bicimlendirici = new Intl.DateTimeFormat('en-US', {
    timeZone: TR_ZAMAN_DILIMI,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const parcalar = bicimlendirici.formatToParts(new Date(iso));
  const bul = (tur: string) => parcalar.find((parca) => parca.type === tur)?.value ?? '';
  return { gun: bul('day'), ay: bul('month'), yil: bul('year') };
}

/**
 * Iki ISO zaman damgasi TR takvim gununde ayni mi (issue #260 -- "bugun icin baska bir olcum
 * girdiniz" tespiti). Backend'in ayni kontrolu (`TurkeyDay.RangeFor`) ile ayni mantik, istemci
 * tarafinda: yalnizca UI'nin "popup gostersin mi" karari icin, sunucudaki gercek 409 kontrolunun
 * YERINE gecmez.
 */
export function ayniTrGunuMu(isoA: string, isoB: string): boolean {
  const a = tarihParcalariniAl(isoA);
  const b = tarihParcalariniAl(isoB);
  return a.gun === b.gun && a.ay === b.ay && a.yil === b.yil;
}

/** Sayi bicimi: Turkcede ondalik virgul, Ingilizcede nokta. */
const SAYI_YERELI: Record<Dil, string> = { tr: 'tr-TR', en: 'en-US' };

export function formatTarih(iso: string, dil: Dil): string {
  const { gun, ay, yil } = tarihParcalariniAl(iso);
  if (dil === 'tr') {
    return `${gun}.${ay}.${yil}`;
  }
  // "09/12" gun/ay belirsizligi yerine ay adi (spec, Bicimlendirme).
  return `${formatKisaTarih(iso, 'en')} ${yil}`;
}

export function formatSaat(iso: string): string {
  const bicimlendirici = new Intl.DateTimeFormat('en-GB', {
    timeZone: TR_ZAMAN_DILIMI,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return bicimlendirici.format(new Date(iso));
}

/**
 * Grafik ekseni icin kisa tarih ("12 Eyl" / "12 Sep"), TR gunune gore. Ingilizcede ay kisaltmasi
 * `en-US`'ten alinir ve gun-ay sirasiyla elle dizilir: `en-GB` yeni ICU surumlerinde "Sept" verir.
 */
export function formatKisaTarih(iso: string, dil: Dil): string {
  if (dil === 'tr') {
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: TR_ZAMAN_DILIMI,
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  }
  const parcalar = new Intl.DateTimeFormat('en-US', {
    timeZone: TR_ZAMAN_DILIMI,
    day: 'numeric',
    month: 'short',
  }).formatToParts(new Date(iso));
  const bul = (tur: string) => parcalar.find((parca) => parca.type === tur)?.value ?? '';
  return `${bul('day')} ${bul('month')}`;
}

export function formatWeight(kg: number, dil: Dil): string {
  // TR ondalik ayraci virgul; gereksiz ",0" eklenmez (80 -> "80"), ama 0 gecerli bir
  // agirlik degeridir ve "0" olarak gosterilir (bos/yok degil). Backend Weight'i
  // numeric(6,2) olarak saklar ve 2 ondalik kabul eder -- maximumFractionDigits burada 1
  // olsaydi 61.25 kg "61,3" olarak gosterilir, sunucudaki degeri istemcide SESSIZCE
  // degistirirdi (review bulgusu I2). Ust sinir ve ondalik hane sayisi sunucuya birakilir.
  return kg.toLocaleString(SAYI_YERELI[dil], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Antrenman suresini (sn) en yakin dakikaya yuvarlayip saat + dakikaya boler (#246). Once toplam
 * dakika yuvarlanir, sonra bolunur -- 59,5 dk "0 sa 60 dk" degil "1 sa 0 dk" olur.
 */
export function saatDakika(saniye: number): { saat: number; dakika: number } {
  const toplamDakika = Math.round(saniye / 60);
  return { saat: Math.floor(toplamDakika / 60), dakika: toplamDakika % 60 };
}

/** "YYYY-MM-DD": TR bugununden `gun` gun onceki TR gunu (API'nin DateOnly `From` parametresi icin). */
export function trBugundenOnce(gun: number, simdi: Date = new Date()): string {
  const { gun: ayinGunu, ay, yil } = tarihParcalariniAl(
    new Date(simdi.getTime() - gun * 86_400_000).toISOString(),
  );
  return `${yil}-${ay}-${ayinGunu}`;
}

/**
 * Grafik araligi metni: "25 Ağu – 10 Eyl 2026". Ilk ve son tarih AYNI TR yilindaysa yil yalnizca
 * sonda yazilir; FARKLI yillardaysa (ör. yil sonunu asan bir aralik) M1 (review bulgusu) geregi ilk
 * tarihe de kendi yili eklenir -- aksi halde "20 Ara – 5 Oca 2027" okuyucuya iki tarihin de 2027'de
 * oldugunu dusundurur.
 */
export function formatAralik(ilkIso: string, sonIso: string, dil: Dil): string {
  const ilkYil = tarihParcalariniAl(ilkIso).yil;
  const sonYil = tarihParcalariniAl(sonIso).yil;
  const ilkMetin =
    ilkYil === sonYil ? formatKisaTarih(ilkIso, dil) : `${formatKisaTarih(ilkIso, dil)} ${ilkYil}`;
  return `${ilkMetin} – ${formatKisaTarih(sonIso, dil)} ${sonYil}`;
}

/** Isaretli fark: "+2,5", "−32,5" (U+2212 eksi isareti), "0". */
export function formatFark(fark: number, dil: Dil): string {
  if (fark === 0) {
    return '0';
  }
  return `${fark > 0 ? '+' : '−'}${formatWeight(Math.abs(fark), dil)}`;
}

const DAKIKA_MS = 60_000;
const SAAT_MS = 60 * DAKIKA_MS;
const GUN_MS = 24 * SAAT_MS;

/**
 * Gecmis listesi karti icin (issue #218): son 24 saat icinde goreli ("3 saat once"), sonrasinda
 * mutlak tarihe (`formatTarih`) doner -- gunler/haftalar once icin "127 saat once" okunaksiz olurdu.
 * `simdi` parametreli: testler gercek saate bagli kalmasin.
 */
export function formatGoreliTarih(iso: string, dil: Dil, simdi: Date = new Date()): string {
  const gecenMs = simdi.getTime() - new Date(iso).getTime();

  if (gecenMs < DAKIKA_MS) {
    return dil === 'tr' ? 'az önce' : 'just now';
  }
  if (gecenMs < SAAT_MS) {
    const dakika = Math.floor(gecenMs / DAKIKA_MS);
    return dil === 'tr' ? `${dakika} dakika önce` : `${dakika} minute${dakika === 1 ? '' : 's'} ago`;
  }
  if (gecenMs < GUN_MS) {
    const saat = Math.floor(gecenMs / SAAT_MS);
    return dil === 'tr' ? `${saat} saat önce` : `${saat} hour${saat === 1 ? '' : 's'} ago`;
  }
  return formatTarih(iso, dil);
}
