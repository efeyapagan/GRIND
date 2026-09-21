import { tr } from '@grind/shared/i18n/tr';
import { en } from '@grind/shared/i18n/en';

type Dugum = { [anahtar: string]: string | Dugum };

function yapraklar(dugum: Dugum, onEk = ''): Map<string, string> {
  const sonuc = new Map<string, string>();
  for (const [anahtar, deger] of Object.entries(dugum)) {
    const yol = onEk ? `${onEk}.${anahtar}` : anahtar;
    if (typeof deger === 'string') {
      sonuc.set(yol, deger);
    } else {
      for (const [altYol, altDeger] of yapraklar(deger, yol)) {
        sonuc.set(altYol, altDeger);
      }
    }
  }
  return sonuc;
}

const degiskenler = (metin: string) =>
  [...metin.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((eslesme) => eslesme[1]).sort();

const trYapraklari = yapraklar(tr);
const enYapraklari = yapraklar(en);

// Anahtar esitligini tip kontrolu (en: Katalog) saglar; bu iki testin yakaladigini saglayamaz.
test('her anahtar iki dilde ayni {{degisken}} kumesini tasir', () => {
  const uyusmayanlar = [...trYapraklari]
    .filter(([yol, metin]) => degiskenler(metin).join() !== degiskenler(enYapraklari.get(yol) ?? '').join())
    .map(([yol]) => yol);
  expect(uyusmayanlar).toEqual([]);
});

test('hicbir Ingilizce metin bos degil', () => {
  const boslar = [...enYapraklari].filter(([, metin]) => metin.trim() === '').map(([yol]) => yol);
  expect(boslar).toEqual([]);
});
