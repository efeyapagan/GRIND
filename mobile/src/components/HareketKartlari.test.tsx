import { render, screen } from '@testing-library/react-native';
import type { HareketIlerlemesi } from '@grind/shared/api/queries';
import HareketKartlari from './HareketKartlari';

const hareket: HareketIlerlemesi = {
  exerciseId: 1,
  exerciseName: 'Bench Press',
  plannedSets: 3,
  completedSets: 0,
  restSeconds: 90,
};

/**
 * #590: antrenmandaki hareket karti duz `bg-surface-1` degil cam kart (spec Karar 9); kosesi buyuyerek
 * acildigi odak kartiyla ayni (`rounded-xl`).
 */
test('hareket karti cam yuzeydedir', async () => {
  await render(
    <HareketKartlari ilerleme={[hareket]} setler={[]} onSec={jest.fn()} onSetDuzenle={jest.fn()} onSiraDegis={jest.fn()} />,
  );

  const sinif: string = screen.getByTestId('hareket-karti-1').props.className;
  expect(sinif).toContain('rounded-xl');
  expect(sinif).not.toMatch(/bg-surface/);
});
