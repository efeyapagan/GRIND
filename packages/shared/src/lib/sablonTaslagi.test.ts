import { describe, expect, test } from 'vitest';
import { oturumdanSablonHareketleri, sablondanSapmaVarMi } from './sablonTaslagi';

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

describe('sablondanSapmaVarMi (#499 -- antrenman ekranindaki "sablon olarak kaydet")', () => {
  const HAREKET = (exerciseId: number) => ({
    exerciseId,
    exerciseName: `Hareket ${exerciseId}`,
    plannedSets: 3,
    completedSets: 0,
    restSeconds: 90,
  });

  test('ayni hareketler: sapma yok (sira onemsiz)', () => {
    expect(sablondanSapmaVarMi([HAREKET(2), HAREKET(1)], [{ exerciseId: 1 }, { exerciseId: 2 }])).toBe(false);
  });

  test('sablonda olmayan hareket EKLENDIYSE sapma vardir', () => {
    expect(sablondanSapmaVarMi([HAREKET(1), HAREKET(3)], [{ exerciseId: 1 }])).toBe(true);
  });

  /** Bitirme ekranindaki sorudan farki tam burasi: CIKARMA da sapmadir (kullanici karari). */
  test('sablondaki hareket CIKARILDIYSA sapma vardir', () => {
    expect(sablondanSapmaVarMi([HAREKET(1)], [{ exerciseId: 1 }, { exerciseId: 2 }])).toBe(true);
  });

  test('bos sablonda hareket varsa sapma vardir', () => {
    expect(sablondanSapmaVarMi([HAREKET(1)], [])).toBe(true);
  });
});
