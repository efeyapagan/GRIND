import { expect, test } from 'vitest';
import type { Egzersiz, EgzersizHacmi, HaftalikIstatistik } from '../api/queries';
import { hacimHaftalari, kasGrubuSatirlari, varsayilanBirTekrarHareketi } from './haftalikIlerleme';

function hafta(weekStart: string, volume: number, sets: [number, number, number, number] = [0, 0, 0, 0]): HaftalikIstatistik {
  const [pushSets, pullSets, legsSets, otherSets] = sets;
  return { weekStart, volume, pushSets, pullSets, legsSets, otherSets };
}

// 6 hafta; sonuncusu (2026-03-09) icinde bulunulan, henuz bitmemis hafta.
const HAFTALAR = [
  hafta('2026-02-02', 100),
  hafta('2026-02-09', 200),
  hafta('2026-02-16', 0),
  hafta('2026-02-23', 400),
  hafta('2026-03-02', 500, [6, 4, 3, 1]),
  hafta('2026-03-09', 50, [8, 4, 1, 0]),
];

/** #184: devam eden hafta grafige girmez -- Pazartesi gunu "Su anki" gerileme gibi okunmasin. */
test('hacim haftalari devam eden haftayi disarida birakir, 1A son 4 tamamlanmis hafta', () => {
  expect(hacimHaftalari(HAFTALAR, 'tum').map((h) => h.weekStart)).toEqual([
    '2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23', '2026-03-02',
  ]);
  expect(hacimHaftalari(HAFTALAR, '1a').map((h) => h.weekStart)).toEqual([
    '2026-02-09', '2026-02-16', '2026-02-23', '2026-03-02',
  ]);
});

test('yalnizca bu hafta varsa tamamlanmis hafta yoktur', () => {
  expect(hacimHaftalari([hafta('2026-03-09', 50)], 'tum')).toEqual([]);
});

test('kas grubu satirlari secili haftanin setlerini ve onceki haftaya farki verir', () => {
  expect(kasGrubuSatirlari(HAFTALAR, 5)).toEqual([
    { kategori: 'Push', set: 8, fark: 2 },
    { kategori: 'Pull', set: 4, fark: 0 },
    { kategori: 'Legs', set: 1, fark: -2 },
    { kategori: 'Other', set: 0, fark: -1 },
  ]);
});

/** Ilk haftanin karsilastirilacak onceki haftasi yok: fark null, "+0" diye yazilmaz. */
test('ilk haftada fark yoktur', () => {
  expect(kasGrubuSatirlari(HAFTALAR, 0).every((satir) => satir.fark === null)).toBe(true);
});

function egzersiz(id: number, measurement: Egzersiz['measurement']): Egzersiz {
  return { id, name: `Hareket ${id}`, category: 'Push', measurement };
}

function hacim(exerciseId: number, setCount: number): EgzersizHacmi {
  return { exerciseId, exerciseName: `Hareket ${exerciseId}`, volume: 0, setCount };
}

/** #184: varsayilan 1RM hareketi en cok set atilan KILOLU hareket; agirliksiz/sureli harekette 1RM yok. */
test('varsayilan 1RM hareketi en cok set atilan kilolu harekettir', () => {
  const egzersizler = [egzersiz(1, 'WeightReps'), egzersiz(2, 'Reps'), egzersiz(3, 'WeightReps')];
  expect(varsayilanBirTekrarHareketi([hacim(1, 10), hacim(2, 40), hacim(3, 12)], egzersizler)).toBe(3);
});

test('kilolu hareket yoksa varsayilan yoktur', () => {
  expect(varsayilanBirTekrarHareketi([hacim(2, 40)], [egzersiz(2, 'Duration')])).toBeNull();
});
