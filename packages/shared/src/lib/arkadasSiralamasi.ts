import type { components } from '../api/schema';
import type { TakvimGorunumu } from './takvim';

/** Bir arkadasin (ya da kullanicinin kendisinin) takvimin gosterdigi DONEMDEKI ozeti (#420). */
export type ArkadasDonemi = components['schemas']['StandingResponse'];

/**
 * Aylik donemde karsilastirma hedefi haftalik hedefin bu kati (#420, kullanici karari).
 *
 * Bilinen yaklasiklik: bir takvim ayi 4 degil 4-5 Pazartesi-Pazar haftasina yayilir, yani 31
 * gunluk bir ayda hedef gercekte oldugundan biraz kolay gorunur. Kullanici bunu bilerek sabit x4'u
 * secti ("aydaki gun / 7" alternatifine karsi).
 */
export const AYLIK_HEDEF_CARPANI = 4;

/**
 * Haftalik siralamanin agirliklari (#430, kullanici karari). Toplam 1.
 *
 * Hedef en agir bilesen: uygulamanin vaadi kisinin KENDI koydugu hedeftir. Hacim gercek eforu,
 * gun sayisi duzenliligi temsil eder. Oranlari degistirmek siralamanin karakterini degistirir --
 * degistirilirse `arkadasSiralamasi.test.ts`teki ornekler de gozden gecirilmeli.
 */
export const AGIRLIKLAR = { hedef: 0.5, hacim: 0.3, gun: 0.2 } as const;

export interface GrupEnYuksekleri {
  hacim: number;
  gun: number;
}

/**
 * Donemin gun hedefi ya da hedef yoksa `null` (#420). Sunucu kullanicinin HAFTALIK hedefini dondurur;
 * donemine gore olceklemek bir arayuz karari oldugu icin burada: haftada aynen, ayda x4.
 */
export function donemHedefi(arkadas: ArkadasDonemi, gorunum: TakvimGorunumu): number | null {
  const haftalik = arkadas.weeklyTargetDays;
  if (haftalik === null || haftalik === undefined || haftalik <= 0) {
    return null;
  }
  return gorunum === 'ay' ? haftalik * AYLIK_HEDEF_CARPANI : haftalik;
}

/**
 * Donemin hedefine ulasma orani (0..1) ya da hedef yoksa `null`. Hedefi ASMAK orani 1'in ustune
 * cikarmaz: cubuk tasmaz ve siralama "kim daha cok asti"ya donmez.
 *
 * `gorunum` varsayilani haftadir: #420 oncesi her cagiran haftayla calisiyordu.
 */
export function hedefOrani(arkadas: ArkadasDonemi, gorunum: TakvimGorunumu = 'hafta'): number | null {
  const hedef = donemHedefi(arkadas, gorunum);
  if (hedef === null) {
    return null;
  }
  return Math.min(1, (arkadas.trainedDays ?? 0) / hedef);
}

/** Paydasi 0 olan bilesen puana 0 katar (bolme hatasi yok). */
function normalize(deger: number, enYuksek: number): number {
  return enYuksek > 0 ? deger / enYuksek : 0;
}

/**
 * Agirlikli siralama puani (#430). Yalnizca ORAN'a bakmak "kim daha cok calisti"yi olcmuyordu:
 * `1/3` her zaman `1/4`un ustundeydi, hacim hic sayilmiyordu.
 *
 * Hacim ve gun GRUPTAKI EN YUKSEGE gore normalize edilir: mutlak kg'i karsilastirmak agir
 * calisani yapisal olarak kayirir (vucut agirligi ve hareket tipi kisiden kisiye cok degisir) ve
 * siralamada yalnizca goreli sira onemlidir. Bu yuzden donem uzunlugundan da bagimsizdir (#420):
 * aylik gorunumde degisen tek sey hedef oraninin paydasi.
 */
export function siralamaPuani(
  arkadas: ArkadasDonemi,
  enYuksek: GrupEnYuksekleri,
  gorunum: TakvimGorunumu = 'hafta',
): number {
  const oran = hedefOrani(arkadas, gorunum) ?? 0;
  const hacim = normalize(arkadas.volume ?? 0, enYuksek.hacim);
  const gun = normalize(arkadas.trainedDays ?? 0, enYuksek.gun);

  return oran * AGIRLIKLAR.hedef + hacim * AGIRLIKLAR.hacim + gun * AGIRLIKLAR.gun;
}

/**
 * Siralama: once hedefi OLANLAR (kullanici karari #418 -- orani olmayan biri, orani dusuk olanin
 * ustune cikmamali), her blogun ICINDE agirlikli puana gore yuksekten dusuge. Esitlikte ada gore
 * alfabetik: sira kararli kalsin.
 *
 * Sunucu siralamaz: "hangi olcut ne kadar agirlik tasir" bir arayuz karari, bu yuzden hesap
 * burada ve testli.
 */
export function arkadaslariSirala(
  arkadaslar: readonly ArkadasDonemi[],
  gorunum: TakvimGorunumu = 'hafta',
): ArkadasDonemi[] {
  const enYuksek: GrupEnYuksekleri = {
    hacim: Math.max(0, ...arkadaslar.map((a) => a.volume ?? 0)),
    gun: Math.max(0, ...arkadaslar.map((a) => a.trainedDays ?? 0)),
  };

  return [...arkadaslar].sort((a, b) => {
    const hedefliA = hedefOrani(a) !== null;
    const hedefliB = hedefOrani(b) !== null;
    if (hedefliA !== hedefliB) return hedefliA ? -1 : 1;

    const puanFarki = siralamaPuani(b, enYuksek, gorunum) - siralamaPuani(a, enYuksek, gorunum);
    if (puanFarki !== 0) return puanFarki;

    return (a.username ?? '').localeCompare(b.username ?? '');
  });
}

/** Donemde antrenman yapmis mi (#488): gun sayilmamis olabilir ama hacim varsa yapilmistir. */
function donemdeCalistiMi(arkadas: ArkadasDonemi): boolean {
  return (arkadas.trainedDays ?? 0) > 0 || (arkadas.volume ?? 0) > 0;
}

/**
 * Lider olan kisinin kullanici adi ya da lider yoksa `null` (#488, kullanici karari). Donem
 * basinda herkes sifirdayken KIMSE lider degildir: taci sirf sirali listenin tepesinde durdugu
 * icin vermek, alfabetik bir esitligi basari gibi gosteriyordu. Biri antrenman yapar yapmaz kiyas
 * baslar.
 *
 * Lider, sirali listenin ILKI degil, calismis ILK kisidir: sira hedefi olanlari one aldigi icin
 * hedefsiz ama calisan biri, hedefli ama hic calismamis birinin ALTINDA durabilir -- tac bir
 * konum degil, bir emek isaretidir.
 */
export function liderKullaniciAdi(sirali: readonly ArkadasDonemi[]): string | null {
  return sirali.find(donemdeCalistiMi)?.username ?? null;
}
