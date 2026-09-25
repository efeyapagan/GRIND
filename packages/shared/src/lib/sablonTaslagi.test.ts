import { expect, test } from 'vitest';
import { oturumdanSablonHareketleri } from './sablonTaslagi';

/**
 * #209/#186: antrenmanin hareket listesi sablon formunun baslangic satirlarina donusur. Liste bir PLAN
 * (SessionExercise), set degil -- hedefsiz (antrenmana sonradan eklenen) hareket formun yeni satir
 * varsayilanini alir, gerceklesen set sayisi hedef yapilmaz.
 */
test('sira korunur, hedefsiz hareket varsayilan hedefi alir, dinlenme aynen tasinir', () => {
  const hareketler = oturumdanSablonHareketleri([
    { exerciseId: 2, exerciseName: 'Squat', plannedSets: 5, completedSets: 1, restSeconds: 180 },
    { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: null, completedSets: 4, restSeconds: 0 },
  ]);

  expect(hareketler).toEqual([
    { exerciseId: 2, exerciseName: 'Squat', plannedSets: 5, restSeconds: 180 },
    { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 3, restSeconds: 0 },
  ]);
});
