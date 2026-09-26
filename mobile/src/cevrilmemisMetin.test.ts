import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * #263 dilim 1: mobilde kullaniciya gorunen her metin katalogdan gelmeli. Tip kontrolu
 * "cevirmeyi unuttum"u yakalayamaz; bu test `mobile/app` ve `mobile/src` altinda (testler haric)
 * YORUM DISINDA Turkceye ozgu harf kalan satirlari listeler.
 *
 * web/src/lib/cevrilmemisMetin.test.ts'in (#177) mobil karsiligi. Ayni sinirlar gecerli:
 * Turkce karaktersiz Turkce metni ("Kaydet", "Set ekle") YAKALAYAMAZ -- tek guvence degildir,
 * gozle kontrol de gerekir. Kasitli bir istisna satir sonuna `// i18n-muaf` ile isaretlenir.
 */
const KOKLER = [join(__dirname, '..', 'app'), join(__dirname)];
const MOBIL_KOK = join(__dirname, '..');
const TURKCE_HARF = /[çğıöşüÇĞİÖŞÜ]/;

function kaynakDosyalari(dizin: string): string[] {
  return readdirSync(dizin, { withFileTypes: true }).flatMap((girdi) => {
    const yol = join(dizin, girdi.name);
    if (girdi.isDirectory()) {
      return girdi.name === 'testUtils' ? [] : kaynakDosyalari(yol);
    }
    return /\.tsx?$/.test(girdi.name) && !/\.test\.tsx?$/.test(girdi.name) ? [yol] : [];
  });
}

/**
 * Dosyadan yorumlari atar. Web'deki surumden farki: COK SATIRLI JSX yorumlari (`{/* ... *\/}`)
 * da atilir -- mobilde bu desen yaygin ve satir satir bakan bir eleyici yorumun ikinci satirini
 * "cevrilmemis metin" sanardi.
 */
function yorumsuzSatirlar(icerik: string): string[] {
  let blokta = false;
  return icerik.split('\n').map((satir) => {
    let s = satir;
    if (blokta) {
      const bitis = s.indexOf('*/');
      if (bitis === -1) return '';
      s = s.slice(bitis + 2);
      blokta = false;
    }
    s = s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*.*?\*\//g, '');
    const baslangic = s.search(/\{?\/\*/);
    if (baslangic !== -1) {
      blokta = true;
      s = s.slice(0, baslangic);
    }
    if (/^\s*(\*|\/\/)/.test(s)) return '';
    return s.replace(/(^|[^:'"`])\/\/.*$/, '$1');
  });
}

test('mobil kaynaklarinda cevrilmemis Turkce metin kalmadi', () => {
  const bulgular: string[] = [];
  for (const kok of KOKLER) {
    for (const dosya of kaynakDosyalari(kok)) {
      const goreli = relative(MOBIL_KOK, dosya).replaceAll('\\', '/');
      const ham = readFileSync(dosya, 'utf-8').split('\n');
      yorumsuzSatirlar(ham.join('\n')).forEach((satir, i) => {
        if (!ham[i].includes('i18n-muaf') && TURKCE_HARF.test(satir)) {
          bulgular.push(`${goreli}:${i + 1}: ${ham[i].trim()}`);
        }
      });
    }
  }
  expect(bulgular).toEqual([]);
});
