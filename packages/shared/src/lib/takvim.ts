import type { Dil } from '../i18n/dil';

/**
 * Takvim (#81) icin saf tarih hesaplari. Gunler "YYYY-MM-DD" metni olarak tasinir (API'nin `DateOnly`
 * bicimi, TR yerel gunu); aritmetik UTC gece yarisi uzerinden yapilir ki cihazin saat dilimi sonucu
 * degistirmesin. Hafta Pazartesi baslar.
 */
export type TakvimGorunumu = 'ay' | 'hafta';
export type SetKademesi = 0 | 1 | 2 | 3 | 4;

const GUN_MS = 86_400_000;
const KADEME_GENISLIGI = 8;

function tarihe(gun: string): Date {
  return new Date(`${gun}T00:00:00Z`);
}

function metne(tarih: Date): string {
  return tarih.toISOString().slice(0, 10);
}

function gunEkle(gun: string, adet: number): string {
  return metne(new Date(tarihe(gun).getTime() + adet * GUN_MS));
}

/** Ayin `fark` ay sonrasindaki ayin `ayinGunu`. gunu (0 = onceki ayin son gunu). */
function ayKaydir(gun: string, fark: number, ayinGunu: number): string {
  const tarih = tarihe(gun);
  return metne(new Date(Date.UTC(tarih.getUTCFullYear(), tarih.getUTCMonth() + fark, ayinGunu)));
}

/** Gunun dahil oldugu haftanin yedi gunu, Pazartesiden Pazara. */
export function haftaGunleri(gun: string): string[] {
  const pazartesiyeUzaklik = (tarihe(gun).getUTCDay() + 6) % 7;
  const pazartesi = gunEkle(gun, -pazartesiyeUzaklik);
  return Array.from({ length: 7 }, (_, sira) => gunEkle(pazartesi, sira));
}

/** Gunun ayinin haftalari; ay disina tasan hucreler `null`. */
export function ayIzgarasi(gun: string): (string | null)[][] {
  const ay = gun.slice(0, 7);
  const sonGun = ayKaydir(gun, 1, 0);
  const haftalar: (string | null)[][] = [];
  for (let pazartesi = haftaGunleri(`${ay}-01`)[0]; pazartesi <= sonGun; pazartesi = gunEkle(pazartesi, 7)) {
    haftalar.push(haftaGunleri(pazartesi).map((aday) => (aday.startsWith(ay) ? aday : null)));
  }
  return haftalar;
}

/** API'ye gidecek aralik: ayin ilk ve son gunu ya da haftanin Pazartesi ve Pazari (iki ucu dahil). */
export function gorunumAraligi(gorunum: TakvimGorunumu, gun: string): { from: string; to: string } {
  if (gorunum === 'ay') {
    return { from: ayKaydir(gun, 0, 1), to: ayKaydir(gun, 1, 0) };
  }
  const gunler = haftaGunleri(gun);
  return { from: gunler[0], to: gunler[6] };
}

/** Onceki/sonraki ayin ilk gunu ya da bir hafta oncesi/sonrasi. */
export function kaydir(gorunum: TakvimGorunumu, gun: string, yon: -1 | 1): string {
  return gorunum === 'ay' ? ayKaydir(gun, yon, 1) : gunEkle(gun, 7 * yon);
}

/**
 * Gosterilen donemden `yon` yonune gidilebilir mi? Gelecege gezinilmez (#81): bugunun donemindeyken
 * ileri gitmek kapali, geriye gitmek her zaman acik. #315'ten beri gezinme kaydirmayla oldugu icin
 * karar iki platformda da BURADAN okunur -- bir dugmenin `disabled`i degil, hareketin kendisi susar.
 */
export function gezilebilirMi(
  gorunum: TakvimGorunumu,
  gosterilen: string,
  yon: -1 | 1,
  bugun: string,
): boolean {
  if (yon === -1) {
    return true;
  }
  return gorunumAraligi(gorunum, kaydir(gorunum, gosterilen, 1)).from <= bugun;
}

/**
 * Hucre rengi kademesi, set sayisina gore: 1-8, 9-16, 17-24, 25+. Sunum esigidir; set sayisinin
 * kendisi sunucudan gelir.
 */
export function setKademesi(setCount: number): SetKademesi {
  if (setCount <= 0) {
    return 0;
  }
  return Math.min(4, Math.ceil(setCount / KADEME_GENISLIGI)) as SetKademesi;
}

const AY_BICIMI: Record<Dil, Intl.DateTimeFormat> = {
  tr: new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
  en: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
};
const GUN_BICIMI: Record<Dil, Intl.DateTimeFormat> = {
  tr: new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', day: 'numeric', month: 'long' }),
  en: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long' }),
};

/** "Eylül 2026" / "September 2026" */
export function ayBasligi(gun: string, dil: Dil): string {
  return AY_BICIMI[dil].format(tarihe(gun));
}

/** "14 Eylül" / "14 September" */
export function gunBasligi(gun: string, dil: Dil): string {
  return GUN_BICIMI[dil].format(tarihe(gun));
}

/** Hucrenin icindeki numara: ayin gunu ("1" ... "31"). */
export function ayinGunu(gun: string): string {
  return String(Number(gun.slice(8, 10)));
}
