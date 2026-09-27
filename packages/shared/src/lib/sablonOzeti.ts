import type { EgzersizKategorisi, Sablon } from '../api/queries';

export interface SablonOzeti {
  /** Sablonda en cok gecen kategori -- karttaki figuru secer. */
  kategori: EgzersizKategorisi;
  /** Kartin alt basligi: ilk uc hareketin adi, sablondaki sirayla. */
  hareketAdlari: string[];
  /** Hareketlerin hedef setlerinin toplami. */
  toplamSet: number;
}

const ALT_BASLIK_HAREKET_SAYISI = 3;

/**
 * #439: antrenman ekranindaki sablon kartinin ozeti. Esitlikte listede ONCE gelen kategori kazanir
 * ki kart her acilista ayni figuru cizsin; hic hareket yoksa `Other`.
 */
export function sablonOzeti(sablon: Sablon): SablonOzeti {
  // Map ekleme sirasini korur: once say, sonra ilk gorulme sirasiyla en buyugu sec.
  const sayilar = new Map<EgzersizKategorisi, number>();
  for (const hareket of sablon.exercises) {
    sayilar.set(hareket.category, (sayilar.get(hareket.category) ?? 0) + 1);
  }
  let kategori: EgzersizKategorisi = 'Other';
  let enCok = 0;
  for (const [aday, sayi] of sayilar) {
    if (sayi > enCok) {
      enCok = sayi;
      kategori = aday;
    }
  }

  return {
    kategori,
    hareketAdlari: sablon.exercises.slice(0, ALT_BASLIK_HAREKET_SAYISI).map((hareket) => hareket.exerciseName),
    toplamSet: sablon.exercises.reduce((toplam, hareket) => toplam + hareket.plannedSets, 0),
  };
}
