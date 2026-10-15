import type { KardiyoDegerleri, Zorluk } from '@grind/shared/api/queries';

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
  | { tur: 'oturumIptal'; anahtar: string; oturumId: number }
  // #647: kardiyo kaydi. Baslat ve Durdur istemci zamaniyla gider (sure cihazdaki gercek andan hesaplanir).
  | {
      tur: 'kardiyoBaslat';
      anahtar: string;
      oturumId: number;
      kardiyoId: number;
      exerciseId: number;
      degerler: Partial<KardiyoDegerleri>;
      startedAt: string;
    }
  | { tur: 'kardiyoDurdur'; anahtar: string; kardiyoId: number; degerler: KardiyoDegerleri; stoppedAt: string }
  | { tur: 'kardiyoDuzelt'; anahtar: string; kardiyoId: number; degerler: KardiyoDegerleri; durationSeconds: number }
  | { tur: 'kardiyoSil'; anahtar: string; kardiyoId: number }
  // #174 dilim 3: sablon islemleri (paylasim ayari HARIC -- o internet ister).
  // `baglananOturumId` (#662): sablon ACIK antrenmandan kaydedildiyse o antrenman; sunucu antrenmani yeni sablona
  // baglar. Adi bilerek `oturumId` DEGIL: antrenmanin kendi islemi sayilip iptalde sablonla birlikte dusmesin.
  | {
      tur: 'sablonOlustur';
      anahtar: string;
      sablonId: number;
      name: string;
      exercises: SablonHareketGirdisi[];
      baglananOturumId?: number;
    }
  | { tur: 'sablonGuncelle'; anahtar: string; sablonId: number; name: string; exercises: SablonHareketGirdisi[] }
  | { tur: 'sablonSil'; anahtar: string; sablonId: number }
  | { tur: 'sablonSirala'; anahtar: string; templateIds: number[] }
  | { tur: 'sablonSabitle'; anahtar: string; sablonId: number; isPinned: boolean };

export interface SablonHareketGirdisi {
  exerciseId: number;
  plannedSets: number;
  restSeconds: number;
}

export type KimlikTuru = 'oturum' | 'set' | 'sablon' | 'kardiyo';

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
        aday === ekleme && aday.tur === 'setEkle'
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

  // #647: gonderilmemis kardiyo silinince Baslat'i ve sonraki islemleri duser (hic olusmayacak).
  if (islem.tur === 'kardiyoSil' && geciciMi(islem.kardiyoId)) {
    const baslatma = kuyruk.find(
      (aday) => aday.tur === 'kardiyoBaslat' && aday.kardiyoId === islem.kardiyoId && beklemede(aday),
    );
    if (baslatma) {
      return kuyruk.filter((aday) => !('kardiyoId' in aday && aday.kardiyoId === islem.kardiyoId));
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
      const dusenKardiyolar = new Set(
        kuyruk.flatMap((aday) => (aday.tur === 'kardiyoBaslat' && aday.oturumId === islem.oturumId ? [aday.kardiyoId] : [])),
      );
      return kuyruk
        .filter(
          (aday) =>
            !('oturumId' in aday && aday.oturumId === islem.oturumId) &&
            !('setId' in aday && dusenSetler.has(aday.setId)) &&
            !('kardiyoId' in aday && dusenKardiyolar.has(aday.kardiyoId)),
        )
        // #662: o antrenmandan kaydedilen sablon KALIR (kullanici onu kaydetti); yalnizca hic olusmayacak
        // antrenmana baglanmaz.
        .map((aday) =>
          aday.tur === 'sablonOlustur' && aday.baglananOturumId === islem.oturumId
            ? { ...aday, baglananOturumId: undefined }
            : aday,
        );
    }
  }

  if (islem.tur === 'sablonGuncelle' && geciciMi(islem.sablonId)) {
    const olusturma = kuyruk.find(
      (aday) => aday.tur === 'sablonOlustur' && aday.sablonId === islem.sablonId && beklemede(aday),
    );
    if (olusturma) {
      return kuyruk.map((aday) => (aday === olusturma ? { ...aday, name: islem.name, exercises: islem.exercises } : aday));
    }
  }

  if (islem.tur === 'sablonSil' && geciciMi(islem.sablonId)) {
    const olusturma = kuyruk.find(
      (aday) => aday.tur === 'sablonOlustur' && aday.sablonId === islem.sablonId && beklemede(aday),
    );
    if (olusturma) {
      return sablonuBirak(kuyruk, islem.sablonId);
    }
  }

  return [...kuyruk, islem];
}

/**
 * Sunucuya hic gitmeyecek (silinen ya da sunucunun reddettigi) gecici sablonun islemlerini duser; onunla
 * baslatilmis antrenman korunur ama sablonsuz olur (sunucuda sablon silinince antrenmanin TemplateId'si de
 * SET NULL olur).
 */
export function sablonuBirak(kuyruk: readonly BekleyenIslem[], sablonId: number): BekleyenIslem[] {
  return kuyruk.flatMap((aday): BekleyenIslem[] => {
    if ('sablonId' in aday && aday.sablonId === sablonId) return [];
    if (aday.tur === 'oturumBaslat' && aday.templateId === sablonId) return [{ ...aday, templateId: null }];
    if (aday.tur === 'sablonSirala') return [{ ...aday, templateIds: aday.templateIds.filter((id) => id !== sablonId) }];
    return [aday];
  });
}

/** Gecici kimligi (antrenman, set, sablon ya da kardiyo) sunucunun verdigi gercek kimlikle degistirir. */
export function kimlikEsle(
  kuyruk: readonly BekleyenIslem[],
  tur: KimlikTuru,
  gecici: number,
  gercek: number,
): BekleyenIslem[] {
  return kuyruk.map((islem) => {
    if (tur === 'sablon') {
      if (islem.tur === 'oturumBaslat' && islem.templateId === gecici) return { ...islem, templateId: gercek };
      if (islem.tur === 'sablonSirala') {
        return { ...islem, templateIds: islem.templateIds.map((id) => (id === gecici ? gercek : id)) };
      }
      if ('sablonId' in islem && islem.sablonId === gecici) return { ...islem, sablonId: gercek };
      return islem;
    }
    if (tur === 'oturum' && 'oturumId' in islem && islem.oturumId === gecici) {
      return { ...islem, oturumId: gercek };
    }
    if (tur === 'oturum' && islem.tur === 'sablonOlustur' && islem.baglananOturumId === gecici) {
      return { ...islem, baglananOturumId: gercek };
    }
    if (tur === 'set' && 'setId' in islem && islem.setId === gecici) {
      return { ...islem, setId: gercek };
    }
    if (tur === 'kardiyo' && 'kardiyoId' in islem && islem.kardiyoId === gecici) {
      return { ...islem, kardiyoId: gercek };
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
