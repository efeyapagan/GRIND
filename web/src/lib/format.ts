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

export function formatTrDate(iso: string): string {
  const { gun, ay, yil } = tarihParcalariniAl(iso);
  return `${gun}.${ay}.${yil}`;
}

export function formatTrTime(iso: string): string {
  const bicimlendirici = new Intl.DateTimeFormat('en-GB', {
    timeZone: TR_ZAMAN_DILIMI,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return bicimlendirici.format(new Date(iso));
}

/** Grafik ekseni icin kisa tarih ("12 Eyl"), TR gunune gore. */
export function formatKisaTarih(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TR_ZAMAN_DILIMI,
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

export function formatWeight(kg: number): string {
  // TR ondalik ayraci virgul; gereksiz ",0" eklenmez (80 -> "80"), ama 0 gecerli bir
  // agirlik degeridir ve "0" olarak gosterilir (bos/yok degil). Backend Weight'i
  // numeric(6,2) olarak saklar ve 2 ondalik kabul eder -- maximumFractionDigits burada 1
  // olsaydi 61.25 kg "61,3" olarak gosterilir, sunucudaki degeri istemcide SESSIZCE
  // degistirirdi (review bulgusu I2). Ust sinir ve ondalik hane sayisi sunucuya birakilir.
  return kg.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
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
export function formatAralik(ilkIso: string, sonIso: string): string {
  const ilkYil = tarihParcalariniAl(ilkIso).yil;
  const sonYil = tarihParcalariniAl(sonIso).yil;
  const ilkMetin = ilkYil === sonYil ? formatKisaTarih(ilkIso) : `${formatKisaTarih(ilkIso)} ${ilkYil}`;
  return `${ilkMetin} – ${formatKisaTarih(sonIso)} ${sonYil}`;
}

/** Isaretli fark: "+2,5", "−32,5" (U+2212 eksi isareti), "0". */
export function formatFark(fark: number): string {
  if (fark === 0) {
    return '0';
  }
  return `${fark > 0 ? '+' : '−'}${formatWeight(Math.abs(fark))}`;
}
