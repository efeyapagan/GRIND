import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import AyiricliListe from './AyiricliListe';

/**
 * #615: cam kartin icindeki satirlar kutu degil, aralarinda sac teli cizgiyle ayrilir. Cizgi yalnizca
 * IKI SATIR ARASINDA durur (ilkin ustunde, sonun altinda yok); kosullu cizilmeyen (`false`/`null`) bir
 * cocuk satir sayilmaz, yoksa yanina bos bir cizgi duserdi (RekorKarti'nin olcu satirlari kosullu).
 */
test('cizgi yalnizca cizilen satirlarin arasina duser', async () => {
  await render(
    <AyiricliListe>
      <Text>bir</Text>
      {false}
      <Text>iki</Text>
      {null}
      <Text>uc</Text>
    </AyiricliListe>,
  );

  expect(screen.getAllByTestId('cam-ayirici')).toHaveLength(2);
});
