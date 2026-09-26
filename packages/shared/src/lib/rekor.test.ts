import { expect, test } from 'vitest';
import type { SetKaydi } from '../api/queries';
import { gecilmisRekorIdleri } from './rekor';

let sonrakiId = 1;
function set(exerciseId: number, weight: number, reps: number, recordType: SetKaydi['recordType']): SetKaydi {
  const id = sonrakiId++;
  return {
    id,
    sessionId: 1,
    exerciseId,
    exerciseName: `Hareket ${exerciseId}`,
    exercisePosition: 1,
    weight,
    reps,
    recordType,
    rir: null,
    createdAt: new Date(Date.UTC(2026, 8, 26, 10, id)).toISOString(),
    restSeconds: null,
  };
}

/**
 * #401: "gecilmis" rekor sunucunun `recordType`'indan turetilir, rekor istemcide yeniden hesaplanmaz.
 * Ayni antrenmanda sonradan gelen kilo rekoru oncekileri gecer; tekrar rekorunu yalnizca AYNI
 * agirliktaki sonraki bir tekrar rekoru gecer.
 */
test('ayni harekette sonraki kilo rekoru oncekini gecer, en sonuncusu canli kalir', () => {
  const ilk = set(1, 80, 5, 'Weight');
  const ikinci = set(1, 85, 5, 'Weight');
  const ucuncu = set(1, 90, 3, 'Weight');

  expect(gecilmisRekorIdleri([ilk, ikinci, ucuncu])).toEqual(new Set([ilk.id, ikinci.id]));
});

test('tekrar rekorunu ayni agirliktaki sonraki tekrar rekoru gecer, baska agirliktaki gecmez', () => {
  const seksen8 = set(1, 80, 8, 'Reps');
  const yetmisBes12 = set(1, 75, 12, 'Reps');
  const seksen9 = set(1, 80, 9, 'Reps');

  expect(gecilmisRekorIdleri([seksen8, yetmisBes12, seksen9])).toEqual(new Set([seksen8.id]));
});

test('kilo rekoru tekrar rekorunu gecmez, tekrar rekoru da kilo rekorunu gecmez', () => {
  const tekrar = set(1, 80, 10, 'Reps');
  const kilo = set(1, 85, 5, 'Weight');
  const tekrarSonra = set(1, 85, 6, 'Reps');

  expect(gecilmisRekorIdleri([tekrar, kilo, tekrarSonra])).toEqual(new Set());
});

test('farkli hareketlerin rekorlari birbirini gecmez; rekorsuz setler hesaba girmez', () => {
  const bench = set(1, 80, 5, 'Weight');
  const squat = set(2, 120, 5, 'Weight');
  const rekorsuz = set(1, 90, 1, 'None');

  expect(gecilmisRekorIdleri([bench, squat, rekorsuz])).toEqual(new Set());
});

test('sira dizideki konumdan degil setin zamanindan gelir', () => {
  const once = set(1, 80, 5, 'Weight');
  const sonra = set(1, 85, 5, 'Weight');

  expect(gecilmisRekorIdleri([sonra, once])).toEqual(new Set([once.id]));
});
