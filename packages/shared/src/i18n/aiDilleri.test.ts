import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { DILLER } from './dil';

/**
 * #199: "uygulamaya yeni dil eklendikce AI da o dilde yorumlasin". Sunucu, ucreti kontrol
 * edebilmek icin kendi izin listesini tutar (istemcinin istedigi kadar dil uretmesine izin
 * verilemez) -- ama bu liste `DILLER` ile AYNI kalmali.
 *
 * Bu test iki listeyi birbirine baglar: bir dili yalnizca birine eklemek CI'da patlar. Kaynak
 * dosyayi okumak kaba ama gercek: iki farkli dildeki iki sabitin ayni kalmasini baska turlu
 * derleyici zorlayamaz.
 */
const SUNUCU_DOSYASI = fileURLToPath(
  new URL('../../../../src/Grind.Api/Services/Ai/InsightLanguages.cs', import.meta.url),
);

function sunucununDilleri(): string[] {
  const kaynak = readFileSync(SUNUCU_DOSYASI, 'utf8');
  const blok = /All\s*=\s*\[([^\]]*)\]/.exec(kaynak);
  if (!blok) {
    throw new Error('InsightLanguages.All bulunamadi -- dosya yeniden mi duzenlendi?');
  }
  return [...blok[1].matchAll(/"([^"]+)"/g)].map((e) => e[1]);
}

test('sunucunun AI dil listesi DILLER ile aynidir', () => {
  expect(sunucununDilleri()).toEqual([...DILLER]);
});

test('her dilin sunucuda bir adi vardir', () => {
  const kaynak = readFileSync(SUNUCU_DOSYASI, 'utf8');

  for (const dil of DILLER) {
    // Ad, prompt'a giren insan okunur karsilik ("Turkce", "English") -- eksikse model dili bilemez.
    expect(kaynak).toContain(`["${dil}"] =`);
  }
});
