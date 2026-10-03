import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * #590: projede iki cam kusagi vardi -- #338/#350'nin `CamYuzey` + opak `border-surface-4` kenari ve
 * #491/#547'nin uc katmani (blur + ustten sonen parilti + sac teli kenar, gorsel tasarim spec'i Karar 9).
 * Tum kartlar ikincisine gecti; `CamYuzey` artik yalnizca uc katmani kuran `CamKatmanlari`nin icinde
 * kullanilir. Bu test eski kusaga geri donusu yakalar.
 *
 * Istisna: alt menu (`KabukTabBar`) #549'un kapsami disinda, kendi isinde ele alinir.
 */
const MOBIL_KOK = join(__dirname, '..');
const KOKLER = [join(MOBIL_KOK, 'app'), __dirname];
const IZINLI = new Set(['src/ui/CamYuzey.tsx', 'src/ui/CamKatmanlari.tsx', 'src/ui/KabukTabBar.tsx']);

function kaynakDosyalari(dizin: string): string[] {
  return readdirSync(dizin, { withFileTypes: true }).flatMap((girdi) => {
    const yol = join(dizin, girdi.name);
    if (girdi.isDirectory()) {
      return kaynakDosyalari(yol);
    }
    return /\.tsx?$/.test(girdi.name) && !/\.test\.tsx?$/.test(girdi.name) ? [yol] : [];
  });
}

test('CamYuzey yalnizca CamKatmanlari icinde kullanilir', () => {
  const ihlaller = KOKLER.flatMap(kaynakDosyalari)
    .map((yol) => relative(MOBIL_KOK, yol).split('\\').join('/'))
    .filter((yol) => !IZINLI.has(yol))
    .filter((yol) => /import CamYuzey\b/.test(readFileSync(join(MOBIL_KOK, yol), 'utf8')));

  expect(ihlaller).toEqual([]);
});
