import type { Zorluk } from '@grind/shared/api/queries';

/**
 * #174 dilim 2: cevrimdisi yapilan antrenman islemleri. Her islem cihazda uretilen tekil bir `anahtar`
 * tasir -- sunucuya `clientRequestId` olarak gider, tekrar denenen istek kaydi iki kez yazmaz.
 *
 * Gecici kimlikler NEGATIFTIR: cevrimdisi baslatilan antrenman ve eklenen setler sunucu kimligi gelene
 * kadar boyle anilir; gelince `kimlikEsle` kuyruktaki sonraki islemleri gunceller.
 */
export type BekleyenIslem =
  | { tur: 'oturumBaslat'; anahtar: string; oturumId: number; templateId: number | null; startedAt: string }
  | {
      tur: 'setEkle';
      anahtar: string;
      oturumId: number;
      setId: number;
      exerciseId: number;
      weight: number | null;
      reps: number | null;
      rir: number | null;
      durationSeconds: number | null;
      createdAt: string;
    }
  | {
      tur: 'setDuzelt';
      anahtar: string;
      setId: number;
      weight: number | null;
      reps: number | null;
      rir: number | null;
      durationSeconds: number | null;
    }
  | { tur: 'setSil'; anahtar: string; setId: number }
  | { tur: 'hareketEkle'; anahtar: string; oturumId: number; exerciseId: number }
  | { tur: 'hareketKaldir'; anahtar: string; oturumId: number; exerciseId: number }
  | { tur: 'hareketSirala'; anahtar: string; oturumId: number; exerciseIds: number[] }
  | { tur: 'oturumBitir'; anahtar: string; oturumId: number; zorluk: Zorluk | null; endedAt: string }
  | { tur: 'oturumIptal'; anahtar: string; oturumId: number };

export function geciciMi(kimlik: number): boolean {
  return kimlik < 0;
}

/**
 * Islemi kuyrugun sonuna ekler; sunucuya hic gitmemis (gecici kimlikli) kayitlar uzerindeki islemleri
 * sikistirir:
 * - gonderilmemis sete duzeltme -> bekleyen ekleme guncellenir;
 * - gonderilmemis set silinince -> bekleyen eklemesi (ve duzeltmeleri) duser;
 * - cevrimdisi baslatilan antrenman iptal edilince -> o antrenmanin butun islemleri duser.
 *
 * `gonderilenAnahtar`: o an sunucuya gonderilmekte olan islem degistirilmez/dusurulmez -- yaniti gelince
 * kimligi eslenir ve sonraki islemler normal yoldan gider.
 */
export function kuyrugaEkle(
  kuyruk: readonly BekleyenIslem[],
  islem: BekleyenIslem,
  gonderilenAnahtar?: string,
): BekleyenIslem[] {
  const beklemede = (aday: BekleyenIslem) => aday.anahtar !== gonderilenAnahtar;

  if (islem.tur === 'setDuzelt' && geciciMi(islem.setId)) {
    const ekleme = kuyruk.find((aday) => aday.tur === 'setEkle' && aday.setId === islem.setId && beklemede(aday));
    if (ekleme) {
      return kuyruk.map((aday) =>
        aday === ekleme
          ? { ...aday, weight: islem.weight, reps: islem.reps, rir: islem.rir, durationSeconds: islem.durationSeconds }
          : aday,
      );
    }
  }

  if (islem.tur === 'setSil' && geciciMi(islem.setId)) {
    const ekleme = kuyruk.find((aday) => aday.tur === 'setEkle' && aday.setId === islem.setId && beklemede(aday));
    if (ekleme) {
      return kuyruk.filter((aday) => !('setId' in aday && aday.setId === islem.setId));
    }
  }

  if (islem.tur === 'oturumIptal' && geciciMi(islem.oturumId)) {
    const baslatma = kuyruk.find(
      (aday) => aday.tur === 'oturumBaslat' && aday.oturumId === islem.oturumId && beklemede(aday),
    );
    if (baslatma) {
      const dusenSetler = new Set(
        kuyruk.flatMap((aday) => (aday.tur === 'setEkle' && aday.oturumId === islem.oturumId ? [aday.setId] : [])),
      );
      return kuyruk.filter(
        (aday) =>
          !('oturumId' in aday && aday.oturumId === islem.oturumId) &&
          !('setId' in aday && dusenSetler.has(aday.setId)),
      );
    }
  }

  return [...kuyruk, islem];
}

/** Gecici kimligi (antrenman ya da set) sunucunun verdigi gercek kimlikle degistirir. */
export function kimlikEsle(
  kuyruk: readonly BekleyenIslem[],
  tur: 'oturum' | 'set',
  gecici: number,
  gercek: number,
): BekleyenIslem[] {
  return kuyruk.map((islem) => {
    if (tur === 'oturum' && 'oturumId' in islem && islem.oturumId === gecici) {
      return { ...islem, oturumId: gercek };
    }
    if (tur === 'set' && 'setId' in islem && islem.setId === gecici) {
      return { ...islem, setId: gercek };
    }
    return islem;
  });
}

/** Tekrar denenen istegi tanimak icin cihazda uretilen UUID v4 (yalnizca tekillik gerekiyor, gizlilik degil). */
export function tekilAnahtar(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (harf) => {
    const rastgele = (Math.random() * 16) | 0;
    return (harf === 'x' ? rastgele : (rastgele & 0x3) | 0x8).toString(16);
  });
}
