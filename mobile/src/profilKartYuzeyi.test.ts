import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * #592: hesap ayarlari, profili duzenle ve paylasilan sablon detayi ekranlarinda kart yuzeyleri cam
 * (`CamKart`, spec Karar 9) -- duz kart sinifi kalmaz. Bu ekranlarin render testi cok sayida sahte veri
 * ister; kart sinifini kaynakta yakalamak ucuz ve geri donusu engeller.
 *
 * Bilerek serbest: giris alanlarinin sinifi (`bg-surface-2`, `bg-inset`) -- alan alandir, cam olmaz.
 */
const EKRANLAR = [
  'app/(tabs)/profile/account.tsx',
  'app/(tabs)/profile/edit.tsx',
  'app/(tabs)/profile/u/[username]/templates/[id].tsx',
];
const KART_SINIFI = /bg-surface-1\b|bg-surface-3\b|border-surface-4\b/;

test.each(EKRANLAR)('%s duz kart yuzeyi tasimaz', (yol) => {
  const satirlar = readFileSync(join(__dirname, '..', yol), 'utf8')
    .split('\n')
    .map((satir, i) => `${i + 1}: ${satir.trim()}`)
    .filter((satir) => KART_SINIFI.test(satir));

  expect(satirlar).toEqual([]);
});
