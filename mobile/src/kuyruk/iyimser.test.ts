import type { AcikOturum, SetKaydi } from '@grind/shared/api/queries';
import {
  baslatIyimser,
  gecmisOzeti,
  hareketEkleIyimser,
  hareketKaldirIyimser,
  setDuzeltIyimser,
  setEkleIyimser,
  setSilIyimser,
  siralaIyimser,
  yeniSetKaydi,
} from './iyimser';

// #174 dilim 2 (kullanici karari): cevrimdisi islemler ekranda HEMEN gorunur, antrenman akisi kesilmez. Set
// sayaci telefonda artar; bitirilen antrenman gecmiste hemen gorunur. PR rozeti hic yoktur (sunucu hesaplar).

const SABLON = {
  id: 7,
  name: 'Push Day',
  exercises: [
    { exerciseId: 1, exerciseName: 'Bench Press', category: 'Push' as const, isArchived: false, plannedSets: 3, restSeconds: 90 },
    { exerciseId: 2, exerciseName: 'Dips', category: 'Push' as const, isArchived: false, plannedSets: 2, restSeconds: 60 },
  ],
};

function oturum(): AcikOturum {
  return baslatIyimser({ oturumId: -1, startedAt: '2026-10-03T10:00:00.000Z', sablon: SABLON });
}

function set(id: number, exerciseId: number, weight: number, reps: number): SetKaydi {
  return yeniSetKaydi({
    id, sessionId: -1, exerciseId, exerciseName: exerciseId === 1 ? 'Bench Press' : 'Dips', weight, reps,
    rir: null, durationSeconds: null, measurement: 'WeightReps', createdAt: '2026-10-03T10:10:00.000Z',
  });
}

test('sablonla baslatma sablonun hareketlerini hedefleriyle ve sifir tamamlanmis setle acar', () => {
  const acik = oturum();

  expect(acik).toMatchObject({ id: -1, isOpen: true, templateId: 7, templateName: 'Push Day' });
  expect(acik.progress).toEqual([
    { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 3, completedSets: 0, restSeconds: 90 },
    { exerciseId: 2, exerciseName: 'Dips', plannedSets: 2, completedSets: 0, restSeconds: 60 },
  ]);
});

test('bos antrenman hareketsiz acilir', () => {
  const acik = baslatIyimser({ oturumId: -1, startedAt: '2026-10-03T10:00:00.000Z', sablon: null });

  expect(acik).toMatchObject({ templateId: null, templateName: null, progress: [] });
});

test('cevrimdisi set listede hemen gorunur, PR rozeti yoktur ve sayac artar', () => {
  const yeni = set(-10, 1, 60, 8);
  const sonuc = setEkleIyimser(oturum(), [], yeni);

  expect(sonuc.setler).toEqual([yeni]);
  expect(yeni.recordType).toBe('None');
  expect(sonuc.oturum.progress[0].completedSets).toBe(1);
});

test('listede olmayan harekete set girilince hareket hedefsiz eklenir', () => {
  const sonuc = setEkleIyimser(oturum(), [], { ...set(-10, 9, 20, 10), exerciseName: 'Curl' });

  expect(sonuc.oturum.progress.at(-1)).toMatchObject({ exerciseId: 9, exerciseName: 'Curl', plannedSets: null, completedSets: 1 });
});

test('set duzeltme degerleri degistirir, silme seti kaldirir ve sayaci azaltir', () => {
  const ilk = setEkleIyimser(oturum(), [], set(-10, 1, 60, 8));

  const duzeltilen = setDuzeltIyimser(ilk.setler, { id: -10, weight: 62.5, reps: 6, rir: 2, durationSeconds: null });
  expect(duzeltilen[0]).toMatchObject({ weight: 62.5, reps: 6, rir: 2 });

  const silinen = setSilIyimser(ilk.oturum, ilk.setler, -10);
  expect(silinen.setler).toEqual([]);
  expect(silinen.oturum.progress[0].completedSets).toBe(0);
});

test('hareket ekleme sona hedefsiz ekler, kaldirma hareketi ve setlerini cikarir, siralama sirayi degistirir', () => {
  const eklenen = hareketEkleIyimser(oturum(), { exerciseId: 9, exerciseName: 'Curl' });
  expect(eklenen.progress.map((h) => h.exerciseId)).toEqual([1, 2, 9]);

  const setli = setEkleIyimser(eklenen, [], set(-10, 2, 0, 10));
  const kaldirilan = hareketKaldirIyimser(setli.oturum, setli.setler, 2);
  expect(kaldirilan.oturum.progress.map((h) => h.exerciseId)).toEqual([1, 9]);
  expect(kaldirilan.setler).toEqual([]);

  expect(siralaIyimser(eklenen, [9, 1, 2]).progress.map((h) => h.exerciseId)).toEqual([9, 1, 2]);
});

/** Kullanici karari: cevrimdisi bitirilen antrenman gecmiste hemen gorunur (gonderilince sunucunun kaydiyla degisir). */
test('bitirilen antrenmanin gecmis ozeti set sayisini, sureyi ve hacmi tasir', () => {
  const ozet = gecmisOzeti(oturum(), [set(-10, 1, 60, 8), set(-11, 1, 60, 6), set(-12, 2, 0, 10)], '2026-10-03T10:45:00.000Z');

  expect(ozet).toMatchObject({
    sessionId: -1,
    startedAt: '2026-10-03T10:00:00.000Z',
    templateId: 7,
    templateName: 'Push Day',
    setCount: 3,
    totalVolume: 840,
    durationSeconds: 2700,
    isVolumeRecord: false,
  });
  expect(ozet.sets).toHaveLength(3);
});
