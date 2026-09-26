import { expect, test } from 'vitest';
import { IKI_TEMADA_AYNI, renklerAcik, renklerKoyu, type RenkPaleti } from '../designTokens';

/**
 * Paletin erisilebilirlik guvenlik agi. web/src/lib/paletKontrast.test.ts'in (#178) ortak pakete
 * tasinmis ve IKI palete birden uygulanan hali (#271): mobilde acik tema gelince ayni esikleri
 * mobil paletin de saglamasi gerekiyor. Esikler WCAG 2.1 AA: metin 4.5:1, metin disi (halka,
 * kenarlik, grafik cizgisi) 3:1.
 *
 * Kaynak artik CSS degil `designTokens.ts`; global.css'in bu degerlerden kaymadigini
 * mobile/src/ui/renkler.test.ts olcer.
 */
const paletler: Record<string, RenkPaleti> = { koyu: renklerKoyu, acik: renklerAcik };
const ZEMINLER = ['bg', 'inset', 'surface-1', 'surface-2', 'surface-3', 'surface-4'] as const;

function bagilParlaklik(renk: string): number {
  const kanallar = [1, 3, 5].map((i) => parseInt(renk.slice(i, i + 2), 16) / 255);
  const [r, g, b] = kanallar.map((k) => (k <= 0.03928 ? k / 12.92 : ((k + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function kontrast(a: string, b: string): number {
  const [yuksek, dusuk] = [bagilParlaklik(a), bagilParlaklik(b)].sort((x, y) => y - x);
  return (yuksek + 0.05) / (dusuk + 0.05);
}

function dusukOranlar(
  onPlan: string,
  esik: number,
  zeminler: readonly string[] = ZEMINLER,
): string[] {
  const dusukler: string[] = [];
  for (const [temaAdi, palet] of Object.entries(paletler)) {
    for (const zemin of zeminler) {
      const oran = kontrast(palet[onPlan as keyof RenkPaleti], palet[zemin as keyof RenkPaleti]);
      if (!(oran >= esik)) {
        dusukler.push(`${temaAdi}: ${onPlan} / ${zemin} = ${oran.toFixed(2)}`);
      }
    }
  }
  return dusukler;
}

test('her iki paletteki her deger #rrggbb hex formatinda', () => {
  // Kontrast hesabi yalnizca hex okur; baska bir format (rgb(), oklch()) sessizce atlanmasin.
  const hexOlmayanlar: string[] = [];
  for (const [temaAdi, palet] of Object.entries(paletler)) {
    for (const [token, deger] of Object.entries(palet)) {
      if (!/^#[0-9a-f]{6}$/.test(deger)) {
        hexOlmayanlar.push(`${temaAdi}: ${token} = ${deger}`);
      }
    }
  }
  expect(hexOlmayanlar).toEqual([]);
});

test('iki palet ayni token kumesini tasir', () => {
  expect(Object.keys(renklerAcik).sort()).toEqual(Object.keys(renklerKoyu).sort());
});

test('acik palet, iki temada ayni olanlar disindaki her tokeni ezer', () => {
  const ezilmeyenler = Object.keys(renklerKoyu).filter(
    (token) =>
      renklerAcik[token as keyof RenkPaleti] === renklerKoyu[token as keyof RenkPaleti] &&
      !(IKI_TEMADA_AYNI as readonly string[]).includes(token),
  );
  expect(ezilmeyenler).toEqual([]);
});

test('metin renkleri her iki temada her yuzeyde en az 4.5:1', () => {
  const dusukler = ['fg', 'muted', 'accent-soft', 'danger'].flatMap((metin) =>
    dusukOranlar(metin, 4.5),
  );
  expect(dusukler).toEqual([]);
});

test('accent-fg her iki temada her yuzeyde en az 3:1 (halka, cizgi, ilerleme dolgusu)', () => {
  expect(dusukOranlar('accent-fg', 3)).toEqual([]);
});

test('accent-fg duz metin olarak kullanildigi yuzeylerde en az 4.5:1', () => {
  // Aktif sekme etiketi (bg), Profil sekme cubugu (surface-1), grafik zemini (surface-2).
  // surface-3/4 BILEREK disarida: koyu temada accent-fg / surface-4 = 3.88 ve bu, acik temadan
  // ONCE de boyleydi (web'deki ayni testin notu) -- ayri bir isin konusu.
  expect(dusukOranlar('accent-fg', 4.5, ['bg', 'surface-1', 'surface-2'])).toEqual([]);
});

test('success her iki temada her yuzeyde en az 3:1', () => {
  expect(dusukOranlar('success', 3)).toEqual([]);
});

test('dolgular kendi uzerlerindeki metinle 4.5:1 saglar', () => {
  for (const [temaAdi, palet] of Object.entries(paletler)) {
    expect(kontrast(palet['on-accent'], palet.accent), `${temaAdi}: on-accent/accent`).toBeGreaterThanOrEqual(4.5);
    expect(
      kontrast(palet['on-danger-bg'], palet['danger-bg']),
      `${temaAdi}: on-danger-bg/danger-bg`,
    ).toBeGreaterThanOrEqual(4.5);
    expect(kontrast(palet['on-success'], palet.success), `${temaAdi}: on-success/success`).toBeGreaterThanOrEqual(4.5);
  }
});
