import { durakAcisi, durakKonumu, enYakinDurak, yayYolu, ZORLUK_KADEMELERI } from './zorlukKadrani';

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
