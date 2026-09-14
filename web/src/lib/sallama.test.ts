import { ivmeFarki, sallamaMi, SALLAMA_ESIGI } from './sallama';

test('ivme farki iki olcum arasindaki degisimin buyuklugudur', () => {
  expect(ivmeFarki({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBe(5);
  expect(ivmeFarki({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(0);
});

test('sabit yer cekimi bileseni sallama sayilmaz', () => {
  // Telefon hareketsiz duruyor: her iki olcum de yer cekimini tasiyor ama FARK sifir.
  const duran = { x: 0, y: 0, z: -9.8 };
  expect(sallamaMi(duran, duran)).toBe(false);
});

test('esigi asan ani degisim sallamadir, altinda kalan degildir', () => {
  const durgun = { x: 0, y: 0, z: -9.8 };
  expect(sallamaMi(durgun, { x: 0, y: 0, z: -9.8 + SALLAMA_ESIGI + 1 })).toBe(true);
  // Cepte tasirken ya da yururken olusan yumusak degisim tetiklememeli.
  expect(sallamaMi(durgun, { x: 2, y: 2, z: -9.8 })).toBe(false);
});
