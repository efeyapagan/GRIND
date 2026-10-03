import { figurPozu } from './figurPozu';

const ANLAR = [0, 0.25, 0.5, 0.75, 1];

/**
 * #604: kasli siluet (gogus, omuz, kol, bacak hacmi) iskeletle birlikte hareket eder -- kaslar sabit bir
 * katman olarak kalip figur kategoriye gore oynarken geride kalmaz.
 */
test.each(['Push', 'Pull', 'Legs', 'Other'] as const)('%s figurunun kasli silueti hareketle degisir', (kategori) => {
  expect(figurPozu(kategori, 1).govde).not.toBe(figurPozu(kategori, 0).govde);
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
