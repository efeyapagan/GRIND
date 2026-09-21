import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * #177: kullaniciya gorunen her metin katalogdan gelmeli. Tip kontrolu "cevirmeyi unuttum"u
 * yakalayamaz; bu test `web/src` altinda (testler haric) yorum disinda Turkceye ozgu harf kalan
 * satirlari listeler. Turkce karakter icermeyen Turkce metni ("Kaydet") YAKALAYAMAZ -- o
 * yuzden tek guvence degil. Kasitli bir istisna satir sonuna `// i18n-muaf` ile isaretlenir.
 */
// DIKKAT: `import.meta.url` degiskene atanmadan dogrudan `new URL(...)` icine yazilirsa, Vite'in
// statik asset-URL analizi bu deseni yakalayip dev-server HTTP adresine cevirir (bkz. paletKontrast.test.ts).
const metaUrl = import.meta.url;
const KOK = fileURLToPath(new URL('..', metaUrl)); // web/src
const TURKCE_HARF = /[çğıöşüÇĞİÖŞÜ]/;

function kaynakDosyalari(dizin: string): string[] {
  return readdirSync(dizin, { withFileTypes: true }).flatMap((girdi) => {
    const yol = join(dizin, girdi.name);
    if (girdi.isDirectory()) {
      return girdi.name === 'test' ? [] : kaynakDosyalari(yol);
    }
    return /\.tsx?$/.test(girdi.name) && !/\.test\.tsx?$/.test(girdi.name) ? [yol] : [];
  });
}

/** Satirdan yorumlari atar: JSX blok yorumu, JS blok yorumu, satir sonu yorum ve `*` ile baslayan blok yorum satiri. */
function yorumsuz(satir: string): string {
  if (/^\s*(\*|\/\*|\/\/)/.test(satir)) {
    return '';
  }
  return satir
    .replace(/\{\/\*.*?\*\/\}/g, '')
    .replace(/\/\*.*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/, '$1');
}

test('web/src altinda cevrilmemis Turkce metin kalmadi', () => {
  const bulgular: string[] = [];
  for (const dosya of kaynakDosyalari(KOK)) {
    const goreli = relative(KOK, dosya).replaceAll('\\', '/');
    readFileSync(dosya, 'utf-8')
      .split('\n')
      .forEach((satir, i) => {
        if (!satir.includes('i18n-muaf') && TURKCE_HARF.test(yorumsuz(satir))) {
          bulgular.push(`${goreli}:${i + 1}: ${satir.trim()}`);
        }
      });
  }
  expect(bulgular).toEqual([]);
});
