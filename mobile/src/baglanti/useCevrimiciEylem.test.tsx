import { Alert, Pressable, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { BaglantiBaglami } from './BaglantiSaglayici';
import { useCevrimiciEylem } from './useCevrimiciEylem';

function Dugme({ eylem }: { eylem: () => void }) {
  const cevrimici = useCevrimiciEylem();
  return (
    <Pressable onPress={cevrimici(eylem)}>
      <Text>Sil</Text>
    </Pressable>
  );
}

/** #174: cevrimdisi izin verilmeyen eylem calismaz, "Internete baglan" uyarisi cikar. */
test('cevrimdisiyken eylem calismaz, uyari cikar', async () => {
  const uyari = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const eylem = jest.fn();
  await render(
    <BaglantiBaglami.Provider value>
      <Dugme eylem={eylem} />
    </BaglantiBaglami.Provider>,
  );

  await fireEvent.press(screen.getByText('Sil'));

  expect(eylem).not.toHaveBeenCalled();
  expect(uyari).toHaveBeenCalledWith('İnternete bağlan', 'Bu bölüm internet bağlantısı gerektiriyor.');
  uyari.mockRestore();
});

test('cevrimiciyken eylem calisir', async () => {
  const eylem = jest.fn();
  await render(<Dugme eylem={eylem} />);

  await fireEvent.press(screen.getByText('Sil'));

  expect(eylem).toHaveBeenCalledTimes(1);
});
