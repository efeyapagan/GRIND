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
