import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { BaglantiBaglami } from './BaglantiSaglayici';
import CevrimdisiKapisi from './CevrimdisiKapisi';

const icerikCizildi = jest.fn();

function Icerik() {
  icerikCizildi();
  return <Text>Rekorlar</Text>;
}

beforeEach(() => icerikCizildi.mockClear());

/** #174: onbellekten gosterilmeyen bolum cevrimdisiyken hic baglanmaz (sorgusu calismaz), uyari cizilir. */
test('cevrimdisiyken icerik baglanmaz, internete baglan uyarisi cizilir', async () => {
  await render(
    <BaglantiBaglami.Provider value>
      <CevrimdisiKapisi>
        <Icerik />
      </CevrimdisiKapisi>
    </BaglantiBaglami.Provider>,
  );

  expect(screen.getByText('İnternete bağlan')).toBeTruthy();
  expect(screen.queryByText('Rekorlar')).toBeNull();
  expect(icerikCizildi).not.toHaveBeenCalled();
});

test('cevrimiciyken icerik oldugu gibi cizilir', async () => {
  await render(
    <CevrimdisiKapisi>
      <Icerik />
    </CevrimdisiKapisi>,
  );

  expect(screen.getByText('Rekorlar')).toBeTruthy();
  expect(screen.queryByTestId('cevrimdisi-uyari')).toBeNull();
});
