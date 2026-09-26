import { render, screen } from '@testing-library/react-native';
import type { SetKaydi } from '@grind/shared/api/queries';
import SetList from './SetList';

function set(id: number, weight: number): SetKaydi {
  return {
    id,
    sessionId: 1,
    exerciseId: 1,
    exerciseName: 'Bench Press',
    exercisePosition: 1,
    weight,
    reps: 5,
    recordType: 'Weight',
    rir: null,
    createdAt: new Date(Date.UTC(2026, 8, 26, 10, id)).toISOString(),
    restSeconds: null,
  };
}

// #404: gecmis ekraninda da ayni antrenmanda sonradan gecilen rekorun rozeti "gecildi" isaretlenir
// (#401 ile ayni kural); son rekorun rozeti isaretsiz kalir.
test('gecmiste sonradan gecilen kilo rekorunun rozeti "geçildi" diye okunur, son rekor okunmaz', async () => {
  await render(<SetList varyant="gecmis" sets={[set(1, 80), set(2, 85)]} />);

  expect(screen.getAllByLabelText('Ağırlık rekoru, geçildi')).toHaveLength(1);
  expect(screen.getAllByText('Ağırlık rekoru')).toHaveLength(2);
});
