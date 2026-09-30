import { render, screen } from '@testing-library/react-native';
import type { HaftalikIstatistik } from '@grind/shared/api/queries';
import HaftalikHacimKarti from './HaftalikHacimKarti';

function hafta(weekStart: string, volume: number): HaftalikIstatistik {
  return { weekStart, volume, pushSets: 0, pullSets: 0, legsSets: 0, otherSets: 0 };
}

/** Devam eden hafta (son satir, 50 kg) "Su anki" olmaz: son tamamlanmis hafta (5.000) olur. */
test('su anki hacim son tamamlanmis haftadir', async () => {
  await render(<HaftalikHacimKarti haftalar={[hafta('2026-02-23', 4000), hafta('2026-03-02', 5000), hafta('2026-03-09', 50)]} />);

  expect(screen.getByText('5.000')).toBeTruthy();
  expect(screen.getByText('+1.000')).toBeTruthy();
});

test('tamamlanmis hafta yoksa grafik yerine aciklama', async () => {
  await render(<HaftalikHacimKarti haftalar={[hafta('2026-03-09', 50)]} />);

  expect(screen.getByText('İlk haftan bitince haftalık hacmin burada görünür.')).toBeTruthy();
});
