import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TEMA_RENKLERI } from './tema';

/**
 * Paletin erisilebilirlik guvenlik agi (#178): index.css TEK dogruluk kaynagidir, bu test onu
 * okuyup kontrast oranlarini olcer. Ileride bir renk elle degistirilirse kontrast sessizce
 * bozulmasin diye var. Esikler WCAG 2.1 AA: metin 4.5:1, metin disi (odak halkasi) 3:1.
 *
 * DIKKAT: `import.meta.url` degiskene atanmadan dogrudan `new URL(...)` icine yazilirsa,
 * Vite'in statik asset-URL analizi bu deseni yakalayip dev-server HTTP adresine cevirir --
 * dosya sisteminden degil. Degiskene atamak bu donusumu devre disi birakir (bkz. tema.test.ts).
 */
const metaUrl = import.meta.url;
const css = readFileSync(fileURLToPath(new URL('../index.css', metaUrl)), 'utf8');

function blokGovdesi(baslik: string): string {
  const bas = css.indexOf(baslik);
  if (bas < 0) {
    throw new Error(`index.css'te "${baslik}" blogu yok`);
  }

  let derinlik = 0;
  for (let i = bas + baslik.length - 1; i < css.length; i++) {
    if (css[i] === '{') {
      derinlik++;
    } else if (css[i] === '}') {
      derinlik--;
      if (derinlik === 0) {
        return css.slice(bas, i);
      }
    }
  }
  throw new Error(`"${baslik}" blogu kapanmamis`);
}

function renkler(baslik: string): Record<string, string> {
  const bulunan: Record<string, string> = {};
  for (const eslesme of blokGovdesi(baslik).matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/g)) {
    bulunan[eslesme[1]] = eslesme[2];
  }
  return bulunan;
}

function bagilParlaklik(renk: string): number {
  const kanallar = [1, 3, 5].map((i) => parseInt(renk.slice(i, i + 2), 16) / 255);
  const [r, g, b] = kanallar.map((k) => (k <= 0.03928 ? k / 12.92 : ((k + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function kontrast(a: string, b: string): number {
  const [yuksek, dusuk] = [bagilParlaklik(a), bagilParlaklik(b)].sort((x, y) => y - x);
  return (yuksek + 0.05) / (dusuk + 0.05);
}

const koyu = renkler('@theme {');
const acikEzmeler = renkler(":root[data-theme='light'] {");
const acik = { ...koyu, ...acikEzmeler };
const paletler = { koyu, acik };
const ZEMINLER = ['bg', 'inset', 'surface-1', 'surface-2', 'surface-3', 'surface-4'];

// Bu ikisi marka renkleridir, iki temada AYNI -- bilerek acik blokta yoklar. Yeni bir token
// iki temada da ayni kalacaksa buraya eklenir; aksi halde test acik varyantini ister.
const IKI_TEMADA_AYNI = ['accent', 'on-accent'];

test('acik palet, iki temada ayni olanlar disindaki her tokeni ezer', () => {
  const beklenen = Object.keys(koyu).filter((token) => !IKI_TEMADA_AYNI.includes(token));
  expect(Object.keys(acikEzmeler).sort()).toEqual(beklenen.sort());
});

test('metin renkleri her iki temada her yuzeyde en az 4.5:1', () => {
  const dusukler: string[] = [];

  for (const [temaAdi, palet] of Object.entries(paletler)) {
    for (const zemin of ZEMINLER) {
      for (const metin of ['fg', 'muted', 'accent-soft', 'danger']) {
        const oran = kontrast(palet[metin], palet[zemin]);
        if (oran < 4.5) {
          dusukler.push(`${temaAdi}: ${metin} / ${zemin} = ${oran.toFixed(2)}`);
        }
      }
    }
  }

  expect(dusukler).toEqual([]);
});

test('odak halkasi her iki temada her yuzeyde en az 3:1', () => {
  const dusukler: string[] = [];

  for (const [temaAdi, palet] of Object.entries(paletler)) {
    for (const zemin of ZEMINLER) {
      const oran = kontrast(palet.focus, palet[zemin]);
      if (oran < 3) {
        dusukler.push(`${temaAdi}: focus / ${zemin} = ${oran.toFixed(2)}`);
      }
    }
  }

  expect(dusukler).toEqual([]);
});

test('accent dolgusu ve hata kutusu kendi metinleriyle 4.5:1 saglar', () => {
  for (const palet of Object.values(paletler)) {
    expect(kontrast(palet['on-accent'], palet.accent)).toBeGreaterThanOrEqual(4.5);
    expect(kontrast(palet['on-danger-bg'], palet['danger-bg'])).toBeGreaterThanOrEqual(4.5);
  }
});

test("odak halkasi index.css'te accent'i degil focus tokenini kullanir", () => {
  expect(css).toContain('outline: 2px solid var(--color-focus)');
});

test('theme-color meta degerleri (tema.ts) ile index.css --color-bg tokenlari ayni kalir', () => {
  // theme-color degerleri tema.ts'de, sayfa zemini index.css'te yasiyor -- ikisi ayri dosya
  // oldugu icin baska hicbir test bunlarin birbirinden kaymasini yakalamaz.
  expect(TEMA_RENKLERI.koyu).toBe(koyu.bg);
  expect(TEMA_RENKLERI.acik).toBe(acik.bg);
});
