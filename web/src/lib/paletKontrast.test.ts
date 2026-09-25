import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TEMA_RENKLERI } from './tema';

/**
 * Paletin erisilebilirlik guvenlik agi (#178): index.css TEK dogruluk kaynagidir, bu test onu
 * okuyup kontrast oranlarini olcer. Ileride bir renk elle degistirilirse kontrast sessizce
 * bozulmasin diye var. Esikler WCAG 2.1 AA: metin 4.5:1, metin disi (odak halkasi, kenarlik,
 * grafik cizgisi) 3:1.
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

interface HarvestSonucu {
  // Token adi -> normalize edilmis (kucuk harf) hex deger.
  hex: Record<string, string>;
  // "token: deger" formatinda, hex OLMAYAN degerler -- kontrast harness'i bunlari olcemez.
  hexOlmayan: string[];
}

// Deger kismini `;`ye kadar genis yakalar (Bulgu 3): eskiden yalnizca kucuk harf #rrggbb'yi
// yakalayan regex, buyuk harfli hex'i (#FFAA00) veya oklch(...) gibi baska bir formati
// SESSIZCE atlardi -- "her token'in acik varyanti var" testi o tokeni hic gormeden gecerdi.
// Simdi her --color-* degeri yakalanir, hex olup olmadigi asagida ayri kontrol edilir.
function renkler(baslik: string): HarvestSonucu {
  const hex: Record<string, string> = {};
  const hexOlmayan: string[] = [];
  for (const eslesme of blokGovdesi(baslik).matchAll(/--color-([\w-]+):\s*([^;]+);/g)) {
    const token = eslesme[1];
    const deger = eslesme[2].trim();
    if (/^#[0-9a-fA-F]{6}$/.test(deger)) {
      hex[token] = deger.toLowerCase();
    } else {
      hexOlmayan.push(`${token}: ${deger}`);
    }
  }
  return { hex, hexOlmayan };
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

const koyuHarvest = renkler('@theme {');
const acikHarvest = renkler(":root[data-theme='light'] {");
const koyu = koyuHarvest.hex;
const acikEzmeler = acikHarvest.hex;
const acik = { ...koyu, ...acikEzmeler };
const paletler = { koyu, acik };
const ZEMINLER = ['bg', 'inset', 'surface-1', 'surface-2', 'surface-3', 'surface-4'];

// Bu ikisi marka renkleridir, iki temada AYNI -- bilerek acik blokta yoklar. Yeni bir token
// iki temada da ayni kalacaksa buraya eklenir; aksi halde test acik varyantini ister.
const IKI_TEMADA_AYNI = ['accent', 'on-accent'];

test("index.css'teki her --color-* degeri hex formatinda", () => {
  // Kontrast harness'i yalnizca #rrggbb hex degerlerini olcebilir. Bir token hex olmayan bir
  // deger (buyuk harfli hex, oklch(...), rgb(...) vb.) alirsa asagidaki testler onu SESSIZCE
  // atlamak yerine burada acikca patlamali -- ya tokeni hex'e cevir ya da bu harness'i genislet.
  const hexOlmayanlar = [...koyuHarvest.hexOlmayan, ...acikHarvest.hexOlmayan];
  expect(hexOlmayanlar).toEqual([]);
});

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

test('accent-fg her iki temada her yuzeyde en az 3:1 (odak halkasi, sekme alt cizgisi, grafik cizgisi, ilerleme dolgusu)', () => {
  const dusukler: string[] = [];

  for (const [temaAdi, palet] of Object.entries(paletler)) {
    for (const zemin of ZEMINLER) {
      const oran = kontrast(palet['accent-fg'], palet[zemin]);
      if (oran < 3) {
        dusukler.push(`${temaAdi}: accent-fg / ${zemin} = ${oran.toFixed(2)}`);
      }
    }
  }

  expect(dusukler).toEqual([]);
});

test('accent-fg metin olarak kullanildigi yuzeylerde (bg, surface-1, surface-2) her iki temada en az 4.5:1', () => {
  // accent-fg sadece ince cizgi/halka degil, DUZ METIN olarak da kullanilir: alt menudeki aktif
  // sekme etiketi ve simgesi (App.tsx, `bg` zemini), Profil sekme cubugu ve CizgiGrafik sekmeleri
  // (`surface-1`), grafik zemini (CizgiGrafik, `surface-2`). Bu ucu 4.5:1'in altina dusmemeli.
  // Olculen degerler: koyu 5.87 / 5.43 / 5.19, acik 6.64 / 6.30 / 5.98.
  //
  // BILEREK surface-3/surface-4'e GENISLETILMEDI: koyu temada accent-fg / surface-4 = 3.88:1,
  // yani "Geri al" seridinin metni (bg-surface-4 uzerinde) koyu temada BUGUN BILE AA'nin altinda.
  // Bu, bu branch'ten ONCE var olan koyu-tema sorunu -- kapsam disi, ayri bir issue'nun isi.
  const METIN_ZEMINLERI = ['bg', 'surface-1', 'surface-2'];
  const dusukler: string[] = [];

  for (const [temaAdi, palet] of Object.entries(paletler)) {
    for (const zemin of METIN_ZEMINLERI) {
      const oran = kontrast(palet['accent-fg'], palet[zemin]);
      if (oran < 4.5) {
        dusukler.push(`${temaAdi}: accent-fg / ${zemin} = ${oran.toFixed(2)}`);
      }
    }
  }

  expect(dusukler).toEqual([]);
});

test('success her iki temada her yuzeyde en az 3:1 ("Devam ediyor" rozetinin noktasi, #226)', () => {
  const dusukler: string[] = [];

  for (const [temaAdi, palet] of Object.entries(paletler)) {
    for (const zemin of ZEMINLER) {
      const oran = kontrast(palet.success, palet[zemin]);
      if (!(oran >= 3)) {
        dusukler.push(`${temaAdi}: success / ${zemin} = ${oran.toFixed(2)}`);
      }
    }
  }

  expect(dusukler).toEqual([]);
});

test('accent dolgusu ve hata kutusu kendi metinleriyle 4.5:1 saglar', () => {
  for (const palet of Object.values(paletler)) {
    expect(kontrast(palet['on-accent'], palet.accent)).toBeGreaterThanOrEqual(4.5);
    expect(kontrast(palet['on-danger-bg'], palet['danger-bg'])).toBeGreaterThanOrEqual(4.5);
    // #315: takvimdeki yesil dolgunun uzerindeki gun rakami.
    expect(kontrast(palet['on-success'], palet.success)).toBeGreaterThanOrEqual(4.5);
  }
});

test("odak halkasi index.css'te accent'i degil accent-fg tokenini kullanir", () => {
  expect(css).toContain('outline: 2px solid var(--color-accent-fg)');
});

test('theme-color meta degerleri (tema.ts) ile index.css --color-bg tokenlari ayni kalir', () => {
  // theme-color degerleri tema.ts'de, sayfa zemini index.css'te yasiyor -- ikisi ayri dosya
  // oldugu icin baska hicbir test bunlarin birbirinden kaymasini yakalamaz.
  expect(TEMA_RENKLERI.koyu).toBe(koyu.bg);
  expect(TEMA_RENKLERI.acik).toBe(acik.bg);
});
