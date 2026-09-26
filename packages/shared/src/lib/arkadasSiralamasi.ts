import type { components } from '../api/schema';

export type ArkadasHaftasi = components['schemas']['WeeklyStandingResponse'];

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
 * Hedefe ulasma orani (0..1) ya da hedef yoksa `null`. Hedefi ASMAK orani 1'in ustune cikarmaz:
 * cubuk tasmaz ve siralama "kim daha cok asti"ya donmez.
 */
export function hedefOrani(arkadas: ArkadasHaftasi): number | null {
  const hedef = arkadas.weeklyTargetDays;
  if (hedef === null || hedef === undefined || hedef <= 0) {
    return null;
  }
  return Math.min(1, (arkadas.trainedDaysThisWeek ?? 0) / hedef);
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
 * siralamada yalnizca goreli sira onemlidir.
 */
export function siralamaPuani(arkadas: ArkadasHaftasi, enYuksek: GrupEnYuksekleri): number {
  const oran = hedefOrani(arkadas) ?? 0;
  const hacim = normalize(arkadas.weeklyVolume ?? 0, enYuksek.hacim);
  const gun = normalize(arkadas.trainedDaysThisWeek ?? 0, enYuksek.gun);

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
export function arkadaslariSirala(arkadaslar: readonly ArkadasHaftasi[]): ArkadasHaftasi[] {
  const enYuksek: GrupEnYuksekleri = {
    hacim: Math.max(0, ...arkadaslar.map((a) => a.weeklyVolume ?? 0)),
    gun: Math.max(0, ...arkadaslar.map((a) => a.trainedDaysThisWeek ?? 0)),
  };

  return [...arkadaslar].sort((a, b) => {
    const hedefliA = hedefOrani(a) !== null;
    const hedefliB = hedefOrani(b) !== null;
    if (hedefliA !== hedefliB) return hedefliA ? -1 : 1;

    const puanFarki = siralamaPuani(b, enYuksek) - siralamaPuani(a, enYuksek);
    if (puanFarki !== 0) return puanFarki;

    return (a.username ?? '').localeCompare(b.username ?? '');
  });
}
