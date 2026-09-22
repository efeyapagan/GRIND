import { adaGoreSirala, aramaIcinSadelestir, egzersizAra, egzersizOner } from './egzersizler';
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

// #231: arama bos donunce "Bunu mu demek istediniz?" onerileri.
const ONERI_HAVUZU: Egzersiz[] = [
  { id: 1, name: 'Bench Press', category: 'Push' },
  { id: 2, name: 'Incline Bench Press', category: 'Push' },
  { id: 3, name: 'Squat', category: 'Legs' },
  { id: 4, name: 'Box Squat', category: 'Legs' },
  { id: 5, name: 'Split Squat', category: 'Legs' },
  { id: 6, name: 'Scott Curl', category: 'Pull' },
  { id: 7, name: 'Sırt Çekişi', category: 'Pull' },
];

const oneriAdlari = (sorgu: string, kategori: Egzersiz['category'] | null = null) =>
  egzersizOner(ONERI_HAVUZU, sorgu, kategori).map((eg) => eg.name);

test('yazim hatasi adin ICINDEKI parcayla karsilastirilir: nench press iki Bench Press i de bulur', () => {
  expect(oneriAdlari('nench press')).toEqual(['Bench Press', 'Incline Bench Press']);
});

test('yan yana iki harfin yer degistirmesi tek hata sayilir', () => {
  // 'sqau' -> 'squa': duz Levenshtein'da 2 hata olurdu ve 4 harfli sorgunun 1 hatalik esigini asardi.
  expect(oneriAdlari('sqau')).toEqual(['Squat', 'Box Squat', 'Split Squat']);
});

test('Turkce harfler oneride de sadelestirilerek karsilastirilir', () => {
  expect(oneriAdlari('sırt çeksi')).toEqual(['Sırt Çekişi']);
});

test('esik: 2 harf ve alti oneri yok, 5+ harfte en fazla 2 hata', () => {
  expect(oneriAdlari('bx')).toEqual([]);
  expect(oneriAdlari('xyzqw')).toEqual([]);
  // nanch -> bench 2 hata, prass -> press 1 hata: toplam 3, esik disi.
  expect(oneriAdlari('nanch prass')).toEqual([]);
});

test('en fazla 3 oneri, once en az hatali; esitlikte uzunlugu sorguya en yakin', () => {
  // Uc Squat da 1 hata: yazilana en cok benzeyen (uzunluk farki en az) Squat once gelir, alfabetik
  // siraya birakilsa Box Squat onde olurdu. Scott Curl ('scot') 2 hata: alfabede once gelse de disarida kalir.
  expect(oneriAdlari('squot')).toEqual(['Squat', 'Box Squat', 'Split Squat']);
});

test('kategori filtresi onerilere de uygulanir', () => {
  expect(oneriAdlari('sqaut', 'Legs')).toContain('Squat');
  expect(oneriAdlari('sqaut', 'Push')).toEqual([]);
});
