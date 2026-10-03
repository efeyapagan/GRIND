import { render, screen } from '@testing-library/react-native';
import type { EgzersizRekoru } from '@grind/shared/api/queries';
import RekorKarti from './RekorKarti';

const rekor: EgzersizRekoru = {
  exerciseId: 3,
  exerciseName: 'Bench Press',
  bestWeight: 100,
  bestWeightReps: 3,
  bestWeightAt: '2026-09-20T09:00:00Z',
  bestReps: 12,
  bestRepsWeight: 60,
  bestRepsAt: '2026-09-21T09:00:00Z',
  measurement: 'WeightReps',
  bestDurationSeconds: null,
};

/**
 * #591: rekor karti duz `bg-surface-2` degil cam kart (spec Karar 9; gecmis kartiyla ayni kose); icindeki
 * olcu kutulari (en agir set, en cok tekrar) opak `surface-1` kutu degil camin ustunde hafif dolgu.
 */
test('rekor karti cam yuzeydedir, icindeki olcu kutulari opak kutu cizmez', async () => {
  await render(<RekorKarti rekor={rekor} />);

  const sinif: string = screen.getByTestId('rekor-karti-3').props.className;
  expect(sinif).toContain('rounded-3xl');
  expect(sinif).not.toMatch(/bg-surface/);
  expect(screen.getAllByTestId('rekor-olcusu')).toHaveLength(2);
  for (const kutu of screen.getAllByTestId('rekor-olcusu')) {
    expect(kutu.props.className).not.toMatch(/bg-surface/);
  }
  expect(screen.getAllByTestId('cam-dolgu')).toHaveLength(2);
});
