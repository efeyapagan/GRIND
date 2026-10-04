import type { Egzersiz, Sablon } from '@grind/shared/api/queries';
import {
  sablonGuncelleIyimser,
  sablonOlusturIyimser,
  sablonSabitleIyimser,
  sablonSilIyimser,
  sablonSiralaIyimser,
} from './sablonIyimser';

// #174 dilim 3 (kullanici karari): telefondaki sablonlar icin olusturma, duzenleme, silme, siralama ve sabitleme
// cevrimdisi da calisir -- liste hemen guncellenir, kuyruk gonderilince sunucunun haliyle degisir.

const EGZERSIZLER: Egzersiz[] = [
  { id: 1, name: 'Bench Press', category: 'Push' },
  { id: 3, name: 'Squat', category: 'Legs' },
];

function sablon(id: number, name: string, isPinned = false): Sablon {
  return { id, name, exercises: [], visibility: 'Friends', savedFromUsername: null, lastUsedAt: null, isPinned };
}

test('olusturma listenin sonuna hareket adlariyla ekler', () => {
  const liste = sablonOlusturIyimser([sablon(7, 'Push')], {
    sablonId: -50,
    name: 'Leg Day',
    exercises: [{ exerciseId: 3, plannedSets: 4, restSeconds: 120 }],
    egzersizler: EGZERSIZLER,
  });

  expect(liste.map((s) => s.id)).toEqual([7, -50]);
  expect(liste[1]).toMatchObject({ name: 'Leg Day', lastUsedAt: null, isPinned: false, savedFromUsername: null });
  expect(liste[1].exercises).toEqual([
    { exerciseId: 3, exerciseName: 'Squat', category: 'Legs', isArchived: false, plannedSets: 4, restSeconds: 120 },
  ]);
});

test('duzenleme adi ve hareketleri degistirir', () => {
  const liste = sablonGuncelleIyimser([sablon(7, 'Push')], {
    sablonId: 7,
    name: 'Push B',
    exercises: [{ exerciseId: 1, plannedSets: 5, restSeconds: 90 }],
    egzersizler: EGZERSIZLER,
  });

  expect(liste[0]).toMatchObject({ id: 7, name: 'Push B' });
  expect(liste[0].exercises[0]).toMatchObject({ exerciseName: 'Bench Press', plannedSets: 5 });
});

test('silme kaldirir, siralama sirayi degistirir, sabitleme isaretler', () => {
  const liste = [sablon(7, 'Push'), sablon(8, 'Pull'), sablon(9, 'Legs')];

  expect(sablonSilIyimser(liste, 8).map((s) => s.id)).toEqual([7, 9]);
  expect(sablonSiralaIyimser(liste, [9, 7, 8]).map((s) => s.id)).toEqual([9, 7, 8]);
  expect(sablonSabitleIyimser(liste, 8, true).find((s) => s.id === 8)?.isPinned).toBe(true);
});
