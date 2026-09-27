import { figurPozu } from './figurPozu';

const ANLAR = [0, 0.25, 0.5, 0.75, 1];

/**
 * #474: animasyonun baslangic karesi bugunku sabit cizimin aynisidir -- "hareketi azalt" acikken figur
 * bu karede durur, yani #439'daki gorunum degismez.
 */
test('baslangic karesi bugunku sabit cizimle aynidir', () => {
  expect(figurPozu('Push', 0)).toMatchObject({
    bar: { x1: 10, x2: 90, y: 14 },
    bas: { x: 50, y: 32 },
    kollar: 'M44 46 L32 32 L32 14 M56 46 L68 32 L68 14',
  });
  expect(figurPozu('Pull', 0)).toMatchObject({
    bar: { x1: 12, x2: 88, y: 8 },
    bas: { x: 50, y: 24 },
    kollar: 'M44 38 L32 28 L34 8 M56 38 L68 28 L66 8',
  });
  expect(figurPozu('Legs', 0)).toMatchObject({
    bar: { x1: 22, x2: 86, y: 30 },
    bas: { x: 60, y: 16 },
    govde: 'M56 30 L40 60 M40 60 L64 66 L58 94',
  });
  expect(figurPozu('Other', 0)).toMatchObject({
    bas: { x: 50, y: 16 },
    kollar: 'M46 32 L36 50 L28 36 M54 32 L62 50 L64 64',
  });
});

/** #474: hareket boyunca bar ve dambil elden kopmaz -- animasyonun her karesinde. */
test.each(ANLAR)('p=%s aninda bar ve dambiller eldedir', (p) => {
  for (const kategori of ['Push', 'Pull'] as const) {
    const poz = figurPozu(kategori, p);
    expect(poz.eller.map((el) => el.y)).toEqual([poz.bar!.y, poz.bar!.y]);
  }
  const curl = figurPozu('Other', p);
  expect(curl.agirliklar).toEqual(curl.eller);
});

/** #474: her figur gercekten hareket eder -- son kare baslangictan farklidir. */
test('her figurun son karesi baslangictan farklidir', () => {
  expect(figurPozu('Push', 1).bar!.y).toBeGreaterThan(figurPozu('Push', 0).bar!.y); // bar omuza iner
  expect(figurPozu('Pull', 1).bas.y).toBeGreaterThan(figurPozu('Pull', 0).bas.y); // govde asiliya iner
  expect(figurPozu('Legs', 1).bas.y).toBeLessThan(figurPozu('Legs', 0).bas.y); // squattan kalkar
  const [solBas, sagBas] = figurPozu('Other', 0).eller;
  const [solSon, sagSon] = figurPozu('Other', 1).eller;
  expect(solSon.y).toBeGreaterThan(solBas.y); // kivrik kol iner
  expect(sagSon.y).toBeLessThan(sagBas.y); // duz kol kivrilir
});
