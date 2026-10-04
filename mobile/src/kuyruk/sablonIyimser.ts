import type { Egzersiz, Sablon, SablonHareketi } from '@grind/shared/api/queries';
import type { SablonHareketGirdisi } from './kuyruk';

/**
 * #174 dilim 3: cevrimdisi sablon islemlerinin listeye (ve detaya) hemen yansimasi. Kuyruk gonderilince sablon
 * listesi sunucudan tazelenir ve bu degerler sunucunun haliyle degisir.
 */

function hareketler(girdiler: SablonHareketGirdisi[], egzersizler: readonly Egzersiz[]): SablonHareketi[] {
  return girdiler.map((girdi) => {
    const egzersiz = egzersizler.find((aday) => aday.id === girdi.exerciseId);
    return {
      exerciseId: girdi.exerciseId,
      exerciseName: egzersiz?.name ?? '',
      category: egzersiz?.category ?? 'Other',
      isArchived: false,
      plannedSets: girdi.plannedSets,
      restSeconds: girdi.restSeconds,
    };
  });
}

interface SablonGirdisi {
  sablonId: number;
  name: string;
  exercises: SablonHareketGirdisi[];
  egzersizler: readonly Egzersiz[];
}

/**
 * Yeni sablon listenin sonuna girer (sunucu da sona ekler). Gorunurluk sunucuda hesap seviyesinden turer;
 * gonderilene kadar varsayilan seviyenin (`Kisitli`) karsiligi `Friends` gosterilir -- paylasim ayari zaten
 * internet ister.
 */
export function sablonOlusturIyimser(liste: readonly Sablon[], girdi: SablonGirdisi): Sablon[] {
  return [
    ...liste,
    {
      id: girdi.sablonId,
      name: girdi.name,
      exercises: hareketler(girdi.exercises, girdi.egzersizler),
      visibility: 'Friends',
      savedFromUsername: null,
      lastUsedAt: null,
      isPinned: false,
    },
  ];
}

export function sablonGuncelleIyimser(liste: readonly Sablon[], girdi: SablonGirdisi): Sablon[] {
  return liste.map((sablon) =>
    sablon.id === girdi.sablonId
      ? { ...sablon, name: girdi.name, exercises: hareketler(girdi.exercises, girdi.egzersizler) }
      : sablon,
  );
}

export function sablonSilIyimser(liste: readonly Sablon[], sablonId: number): Sablon[] {
  return liste.filter((sablon) => sablon.id !== sablonId);
}

export function sablonSiralaIyimser(liste: readonly Sablon[], templateIds: number[]): Sablon[] {
  const sablonlar = new Map(liste.map((sablon) => [sablon.id, sablon]));
  const sirali = templateIds.flatMap((id) => sablonlar.get(id) ?? []);
  // Siralamada olmayanlar (olmamali) kaybolmasin diye sona eklenir.
  return [...sirali, ...liste.filter((sablon) => !templateIds.includes(sablon.id))];
}

export function sablonSabitleIyimser(liste: readonly Sablon[], sablonId: number, isPinned: boolean): Sablon[] {
  return liste.map((sablon) => (sablon.id === sablonId ? { ...sablon, isPinned } : sablon));
}
