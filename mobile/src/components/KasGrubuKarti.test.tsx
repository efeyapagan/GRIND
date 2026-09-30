import { fireEvent, render, screen } from '@testing-library/react-native';
import type { HaftalikIstatistik } from '@grind/shared/api/queries';
import KasGrubuKarti from './KasGrubuKarti';

function hafta(weekStart: string, sets: [number, number, number, number]): HaftalikIstatistik {
  const [pushSets, pullSets, legsSets, otherSets] = sets;
  return { weekStart, volume: 0, pushSets, pullSets, legsSets, otherSets };
}

const HAFTALAR = [hafta('2026-02-23', [0, 0, 0, 0]), hafta('2026-03-02', [6, 4, 3, 1]), hafta('2026-03-09', [8, 4, 1, 0])];

test('varsayilan bu hafta: setler ve onceki haftaya fark, esit farkta metin yok', async () => {
  await render(<KasGrubuKarti haftalar={HAFTALAR} />);

  expect(screen.getByText('Bu hafta')).toBeTruthy();
  expect(screen.getByLabelText('Push: 8 set')).toBeTruthy();
  expect(screen.getByText('+2')).toBeTruthy();
  expect(screen.getByText('−2')).toBeTruthy();
  expect(screen.queryByText('+0')).toBeNull();
  expect(screen.getByRole('button', { name: 'Sonraki hafta' }).props.accessibilityState).toMatchObject({ disabled: true });
});

test('onceki haftaya gecince o haftanin setleri gorunur', async () => {
  await render(<KasGrubuKarti haftalar={HAFTALAR} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Önceki hafta' }));

  expect(screen.queryByText('Bu hafta')).toBeNull();
  expect(screen.getByLabelText('Push: 6 set')).toBeTruthy();
});

/** Setsiz hafta: dort sifir cubuk degil tek bir aciklama. */
test('setsiz haftada antrenman yok yazar', async () => {
  await render(<KasGrubuKarti haftalar={HAFTALAR} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Önceki hafta' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Önceki hafta' }));

  expect(screen.getByText('Bu haftada antrenman yok.')).toBeTruthy();
  expect(screen.queryByLabelText('Push: 0 set')).toBeNull();
  expect(screen.getByRole('button', { name: 'Önceki hafta' }).props.accessibilityState).toMatchObject({ disabled: true });
});
