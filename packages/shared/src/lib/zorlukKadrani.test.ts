import { expect, test } from 'vitest';
import {
  durakAcisi,
  durakKonumu,
  enYakinDurak,
  kadranTitresimi,
  yayKonumu,
  yayYolu,
  ZORLUK_KADEMELERI,
} from './zorlukKadrani';

/**
 * #182: zorluk kadrani tam halka degil, alti acik bir "surat kadrani" -- 1 solda, 5 sagda, yay
 * boyunca sirali. Geometri web ve mobil kadranin ORTAK kaynagi; acilar ekran koordinatinda
 * (0° = sag, 90° = asagi, y asagi dogru artar).
 */
function nokta(derece: number) {
  const radyan = (derece * Math.PI) / 180;
  return { x: Math.cos(radyan), y: Math.sin(radyan) };
}

test('ilk durak solda son durak sagda, ikisi ayni yukseklikte ve merkezin altinda', () => {
  const ilk = nokta(durakAcisi(0));
  const son = nokta(durakAcisi(ZORLUK_KADEMELERI.length - 1));

  expect(ilk.x).toBeLessThan(0);
  expect(son.x).toBeGreaterThan(0);
  expect(ilk.y).toBeCloseTo(son.y);
  expect(ilk.y).toBeGreaterThan(0);
});

test('orta durak tepede', () => {
  const orta = nokta(durakAcisi(2));

  expect(orta.x).toBeCloseTo(0);
  expect(orta.y).toBeCloseTo(-1);
});

test('dokunus acisina en yakin duraga duser', () => {
  expect(enYakinDurak(0, -1)).toBe(2);
  const sagUst = nokta(durakAcisi(3) + 20);
  expect(enYakinDurak(sagUst.x, sagUst.y)).toBe(3);
});

test('yayin altindaki bosluga dokunus en yakin uca duser', () => {
  const sagaYakin = nokta(80);
  const solaYakin = nokta(100);

  expect(enYakinDurak(sagaYakin.x, sagaYakin.y)).toBe(4);
  expect(enYakinDurak(solaYakin.x, solaYakin.y)).toBe(0);
});

/** #182: yayin baslangicindan secili durağa kadar olan kismi dolgu olarak cizilir (surat kadrani ibresi). */
test('dolgu yayi ilk duraktan verilen duraga kadar gider', () => {
  const orta = yayYolu(140, 112, 2);
  const tepe = durakKonumu(2, 140, 112);
  expect(orta.endsWith(`${tepe.x} ${tepe.y}`)).toBe(true);
  // 120° < 180°: kucuk yay; tam yay 240° oldugu icin buyuk yay bayragi tasir.
  expect(orta).toContain(' 0 0 1 ');
  expect(yayYolu(140, 112)).toContain(' 0 1 1 ');
});

/**
 * #388: cevirirken titresim, parmagin yay uzerindeki SUREKLI konumundan (durak birimiyle 0–4) cikar --
 * secili durak bu konumun yuvarlanmis halidir.
 */
test('yay konumu duraklarda tam sayi, iki durak arasinda ondalik, alt boslukta en yakin uc', () => {
  for (let sira = 0; sira < ZORLUK_KADEMELERI.length; sira += 1) {
    const durak = nokta(durakAcisi(sira));
    expect(yayKonumu(durak.x, durak.y)).toBeCloseTo(sira);
  }
  const ara = nokta((durakAcisi(0) + durakAcisi(1)) / 2);
  expect(yayKonumu(ara.x, ara.y)).toBeCloseTo(0.5);
  expect(yayKonumu(nokta(80).x, nokta(80).y)).toBe(4);
  expect(yayKonumu(nokta(100).x, nokta(100).y)).toBe(0);
});

/** #388: duraklar arasinda ince "tik"ler, secim yeni bir duraga oturunca tok vurus ("tiiiirt"). */
test('konum degisince: yeni duraga gecis tok, durak arasi ince adim ince, kucuk kipirti titresimsiz', () => {
  expect(kadranTitresimi(0.4, 0.6)).toBe('tok');
  expect(kadranTitresimi(1.1, 1.3)).toBe('ince');
  expect(kadranTitresimi(1.05, 1.1)).toBeNull();
});
