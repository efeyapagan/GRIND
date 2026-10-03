import { render } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import { BaglantiBaglami } from '../baglanti/BaglantiSaglayici';
import SablonFiguru from './SablonFiguru';

/**
 * #174 (kullanici karari): cevrimdisiyken sablon figurleri oynamaz, baslangic karesinde durur -- "hareketi
 * azalt" ve `canli=false` ile ayni yol. Cevrimiciyken figur kendi hareketini tekrarlar (#474).
 */
let tekrar: jest.SpyInstance;

beforeEach(() => {
  tekrar = jest.spyOn(Reanimated, 'withRepeat');
});

afterEach(() => {
  tekrar.mockRestore();
});

test('cevrimiciyken figur animasyonu baslar', async () => {
  await render(<SablonFiguru kategori="Push" boyut={80} />);

  expect(tekrar).toHaveBeenCalled();
});

test('cevrimdisiyken figur animasyonu baslamaz', async () => {
  await render(
    <BaglantiBaglami.Provider value>
      <SablonFiguru kategori="Push" boyut={80} />
    </BaglantiBaglami.Provider>,
  );

  expect(tekrar).not.toHaveBeenCalled();
});
