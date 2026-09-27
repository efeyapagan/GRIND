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

/** Tamamen bos bir yapisal yanit gostermeye degmez ve JSON gorunumludur: okunamadi sayilir. */
test('hicbir alani dolu olmayan json okunamadi sayilir', () => {
  expect(yorumuCozumle(JSON.stringify({ ozet: '', basarilar: [] })).bicim).toBe('okunamadi');
});

test('bos metin duz bicimdir', () => {
  expect(yorumuCozumle('')).toEqual({ bicim: 'duz', metin: '' });
});

// ---- Ham JSON kullaniciya dokulmez (#463) ----

/**
 * KRITIK (kullanici sikayeti): "analizi ilk aldigimda direkt JSON gordum". Cozumlenemeyen ama
 * JSON GORUNUMLU bir icerigi oldugu gibi basmak, kullaniciya parantez yigini gosterir.
 */
test('json gorunumlu ama cozumlenemeyen icerik okunamadi olarak isaretlenir', () => {
  const sonuc = yorumuCozumle('{"ozet": "yarim kal');

  expect(sonuc).toEqual({ bicim: 'okunamadi', metin: '{"ozet": "yarim kal' });
});

test('sema disi gecerli json da okunamadi sayilir', () => {
  expect(yorumuCozumle('{"foo": 1}').bicim).toBe('okunamadi');
});

/** AYIRT EDICI: eski markdown kayitlar JSON gorunumlu DEGIL -- duz metin olarak cizilmeye devam eder. */
test('markdown metin duz kalir, okunamadi degil', () => {
  expect(yorumuCozumle('**Genel gidişat**\n- İyi gidiyorsun.').bicim).toBe('duz');
});

/** Ham metin ATILMAZ: kullanici isterse gorebilsin diye sonucta tasinir. */
test('okunamadi durumunda ham metin korunur', () => {
  const sonuc = yorumuCozumle('{bozuk');

  expect(sonuc.bicim === 'okunamadi' && sonuc.metin).toBe('{bozuk');
});
