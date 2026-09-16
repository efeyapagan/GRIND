import { adaGoreSirala, aramaIcinSadelestir, egzersizAra } from './egzersizler';
import type { Egzersiz } from '../api/queries';

const HAVUZ: Egzersiz[] = [
  { id: 1, name: 'Bench Press', category: 'Push' },
  { id: 2, name: 'Incline Dumbbell Press', category: 'Push' },
  { id: 3, name: 'Sırt Çekişi', category: 'Pull' },
  { id: 4, name: 'Göğüs Fly', category: 'Push' },
];

test('Turkce harfler ASCII karsiliklarina indirgenir', () => {
  expect(aramaIcinSadelestir('Sırt Çekişi')).toBe('sirt cekisi');
  expect(aramaIcinSadelestir('GÖĞÜS')).toBe('gogus');
  // i/ı/İ/I hepsi ayni kovada.
  expect(aramaIcinSadelestir('İI ı i')).toBe('ii i i');
});

test('Ingilizce adlar Turkce klavyeyle de bulunur', () => {
  // toLocaleLowerCase('tr') kullanilsaydi 'I' -> 'ı' olur ve bu eslesme KACIRILIRDI.
  expect(egzersizAra(HAVUZ, 'incline').map((eg) => eg.id)).toEqual([2]);
  expect(egzersizAra(HAVUZ, 'ıncline').map((eg) => eg.id)).toEqual([2]);
});

test('Turkce adlar noktasiz/sapkasiz yazilsa da bulunur', () => {
  expect(egzersizAra(HAVUZ, 'sirt').map((eg) => eg.id)).toEqual([3]);
  expect(egzersizAra(HAVUZ, 'gogus').map((eg) => eg.id)).toEqual([4]);
});

test('isim ICINDE gecen eslesir, bos sorgu listenin tamamini dondurur', () => {
  expect(egzersizAra(HAVUZ, 'press').map((eg) => eg.id)).toEqual([1, 2]);
  expect(egzersizAra(HAVUZ, '   ')).toHaveLength(4);
  expect(egzersizAra(HAVUZ, 'yok')).toHaveLength(0);
});

test('kategori verilince yalnizca o kategori kalir, arama ile birlikte uygulanir (#77)', () => {
  expect(egzersizAra(HAVUZ, '', 'Pull').map((eg) => eg.id)).toEqual([3]);
  expect(egzersizAra(HAVUZ, 'press', 'Push').map((eg) => eg.id)).toEqual([1, 2]);
  expect(egzersizAra(HAVUZ, 'sirt', 'Push')).toHaveLength(0);
  expect(egzersizAra(HAVUZ, '', 'Legs')).toHaveLength(0);
});

test('siralama Turkce alfabetik kalir', () => {
  expect(adaGoreSirala(HAVUZ).map((eg) => eg.name)).toEqual([
    'Bench Press',
    'Göğüs Fly',
    'Incline Dumbbell Press',
    'Sırt Çekişi',
  ]);
});
