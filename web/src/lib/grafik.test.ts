import { eksenDegerleri } from './grafik';

test('eksen degerleri 1-2-2,5-5 adimlariyla araligi kapsar', () => {
  expect(eksenDegerleri(183, 214)).toEqual([180, 190, 200, 210, 220]);
});

test('tek degerde eksen bir adim yukari genisler', () => {
  expect(eksenDegerleri(800, 800)).toEqual([800, 1000]);
});
