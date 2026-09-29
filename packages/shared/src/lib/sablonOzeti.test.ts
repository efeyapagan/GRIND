import { expect, test } from 'vitest';
import { sablonOzeti } from './sablonOzeti';
import type { Sablon, SablonHareketi } from '../api/queries';

function hareket(exerciseName: string, category: SablonHareketi['category'], plannedSets: number): SablonHareketi {
  return { exerciseId: 0, exerciseName, category, isArchived: false, plannedSets, restSeconds: 90 };
}

function sablon(exercises: SablonHareketi[]): Sablon {
  return {
    id: 1,
    name: 'Push Day',
    exercises,
    visibility: 'Friends',
    savedFromUsername: null,
    lastUsedAt: null,
  };
}

/**
 * #439: antrenman ekranindaki kart; figuru en cok gecen kategoriden secer, alt basliga ilk uc
 * hareketin adini, sayac satirina toplam hedef seti yazar.
 */
test('baskin kategori en cok gecendir; ilk uc hareket adi ve toplam hedef set doner', () => {
  const ozet = sablonOzeti(
    sablon([
      hareket('Bench Press', 'Push', 4),
      hareket('Barbell Row', 'Pull', 3),
      hareket('Overhead Press', 'Push', 3),
      hareket('Dips', 'Push', 2),
    ]),
  );

  expect(ozet).toEqual({
    kategori: 'Push',
    hareketAdlari: ['Bench Press', 'Barbell Row', 'Overhead Press'],
    toplamSet: 12,
  });
});

/** Esitlikte listede ONCE gelen kategori kazanir (kart her acilista ayni figuru cizsin); bos sablon Other. */
test('esitlikte listede once gelen kategori kazanir, bos sablon Other olur', () => {
  expect(sablonOzeti(sablon([hareket('Pull Up', 'Pull', 3), hareket('Squat', 'Legs', 3)])).kategori).toBe('Pull');
  expect(sablonOzeti(sablon([]))).toEqual({ kategori: 'Other', hareketAdlari: [], toplamSet: 0 });
});
