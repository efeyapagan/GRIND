import { eksenDegerleri } from './grafik';

test('eksen degerleri 1-2-2,5-5 adimlariyla araligi kapsar', () => {
  expect(eksenDegerleri(183, 214)).toEqual([180, 190, 200, 210, 220]);
});

test('tek degerde eksen bir adim yukari genisler', () => {
  expect(eksenDegerleri(800, 800)).toEqual([800, 1000]);
});

test('cok yakin degerlerde adim 0,5 kg altina inmez (M3 review bulgusu)', () => {
  const degerler = eksenDegerleri(124.14, 124.15);
  expect(degerler).toEqual([124, 124.5]);
  for (let i = 1; i < degerler.length; i += 1) {
    expect(degerler[i] - degerler[i - 1]).toBeGreaterThanOrEqual(0.5);
  }
});
