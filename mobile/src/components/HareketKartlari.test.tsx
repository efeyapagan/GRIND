import { render, screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { HareketIlerlemesi } from '@grind/shared/api/queries';
import HareketKartlari from './HareketKartlari';

// Gecmis kendi sorgusunu yapar; bu testin konusu degil.
jest.mock('./HareketGecmisi', () => () => null);

const ILERLEME: HareketIlerlemesi[] = [
  { exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 3, completedSets: 0, restSeconds: 90 },
  { exerciseId: 2, exerciseName: 'Pec Deck', plannedSets: 2, completedSets: 0, restSeconds: 90 },
];

function cizdir(secilenId: number, seciliKartAlti: React.ReactNode) {
  return render(
    <HareketKartlari
      ilerleme={ILERLEME}
      setler={[]}
      secilenId={secilenId}
      onSec={jest.fn()}
      onSetSil={jest.fn()}
      onHareketKaldir={jest.fn()}
      onSiraDegis={jest.fn()}
      seciliKartAlti={seciliKartAlti}
    />,
  );
}

/**
 * #274: mobilde set paneli ekranin altina sabit degil, SECILI kartin hemen altinda acilir -- boylece
 * kart ve panel her zaman alt alta durur, panel karti ortmez.
 */
test('set paneli yalnizca secili kartin altinda cizilir', async () => {
  await cizdir(2, <Text>SET PANELI</Text>);

  const pecDeckKarti = screen.getByTestId('hareket-karti-2');
  expect(within(pecDeckKarti).getByText('SET PANELI')).toBeTruthy();
  expect(within(screen.getByTestId('hareket-karti-1')).queryByText('SET PANELI')).toBeNull();
});
