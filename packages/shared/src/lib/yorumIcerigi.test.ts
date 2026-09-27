import { expect, test } from 'vitest';
import { yorumuCozumle } from './yorumIcerigi';

const tamJson = JSON.stringify({
  ozet: 'Düzenli gidiyorsun.',
  basarilar: ['Bench Press rekoru'],
  uyarilar: ['Çekiş hacmi düşük'],
  tavsiyeler: ['Haftaya bir kürek günü ekle'],
});

test('yapisal yorum alanlarina ayrilir', () => {
  const sonuc = yorumuCozumle(tamJson);

  expect(sonuc).toEqual({
    bicim: 'yapisal',
    ozet: 'Düzenli gidiyorsun.',
    basarilar: ['Bench Press rekoru'],
    uyarilar: ['Çekiş hacmi düşük'],
    tavsiyeler: ['Haftaya bir kürek günü ekle'],
  });
});

/** Model bazen JSON'u ``` bloguna sarar; bu, bozuk bir yanit degil. */
test('kod blogu icindeki json da cozumlenir', () => {
  const sonuc = yorumuCozumle('```json\n' + tamJson + '\n```');

  expect(sonuc.bicim).toBe('yapisal');
});

/**
 * KRITIK: #454 oncesi uretilmis 139 kayit duz markdown. Yeniden uretmek yeni bir LLM ucreti
 * demek -- ekran onlari oldugu gibi gostermeli.
 */
test('markdown metin duz bicim olarak doner', () => {
  const sonuc = yorumuCozumle('**Genel gidişat**\n- İyi gidiyorsun.');

  expect(sonuc).toEqual({ bicim: 'duz', metin: '**Genel gidişat**\n- İyi gidiyorsun.' });
});

/** KRITIK: bozuk JSON'da yorum KAYBOLMAZ; ucreti odenmis metin oldugu gibi gosterilir. */
test('bozuk json duz metin olarak gosterilir', () => {
  const sonuc = yorumuCozumle('{"ozet": "yarim kal');

  expect(sonuc).toEqual({ bicim: 'duz', metin: '{"ozet": "yarim kal' });
});

/** Gecerli JSON ama bizim semamiz degilse uydurma yapilmaz: duz metne dusulur. */
test('baska sekilde bir json duz metne duser', () => {
  const sonuc = yorumuCozumle('{"foo": 1}');

  expect(sonuc.bicim).toBe('duz');
});

test('eksik alanlar bos dizi olur, uydurulmaz', () => {
  const sonuc = yorumuCozumle(JSON.stringify({ ozet: 'Kısa.' }));

  expect(sonuc).toEqual({ bicim: 'yapisal', ozet: 'Kısa.', basarilar: [], uyarilar: [], tavsiyeler: [] });
});

/** Yalnizca tavsiye donen bir yanit da gecerlidir: ozet zorunlu degil. */
test('ozetsiz ama listeli yanit yapisaldir', () => {
  const sonuc = yorumuCozumle(JSON.stringify({ tavsiyeler: ['Dinlen'] }));

  expect(sonuc).toEqual({ bicim: 'yapisal', ozet: '', basarilar: [], uyarilar: [], tavsiyeler: ['Dinlen'] });
});

/** Dizi icindeki metin olmayan degerler ATILIR: ekranda "[object Object]" gorunmesin. */
test('metin olmayan madde atilir', () => {
  const sonuc = yorumuCozumle(JSON.stringify({ tavsiyeler: ['Dinlen', 42, null, { a: 1 }, '  '] }));

  expect(sonuc).toEqual({ bicim: 'yapisal', ozet: '', basarilar: [], uyarilar: [], tavsiyeler: ['Dinlen'] });
});

/** Tamamen bos bir yapisal yanit gostermeye degmez: duz metne duser, kullanici en azindan bir sey gorur. */
test('hicbir alani dolu olmayan json duz metne duser', () => {
  const sonuc = yorumuCozumle(JSON.stringify({ ozet: '', basarilar: [] }));

  expect(sonuc.bicim).toBe('duz');
});

test('bos metin duz bicimdir', () => {
  expect(yorumuCozumle('')).toEqual({ bicim: 'duz', metin: '' });
});
