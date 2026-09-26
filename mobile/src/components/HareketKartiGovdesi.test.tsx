import { render, screen } from '@testing-library/react-native';
import type { HareketIlerlemesi, SetKaydi } from '@grind/shared/api/queries';
import HareketKartiGovdesi from './HareketKartiGovdesi';

const hareket: HareketIlerlemesi = {
  exerciseId: 1,
  exerciseName: 'Bench Press',
  plannedSets: 3,
  completedSets: 2,
  restSeconds: 90,
};

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

// #401: ayni antrenmanda iki kilo rekoru kirilinca ilkinin rozeti "gecildi" olarak isaretlenir,
// sonuncusu canli kalir. Ekran okuyucu bu durumu satirin etiketinden duyar.
test('sonradan gecilen kilo rekorunun satiri "geçildi" diye okunur, son rekor okunmaz', async () => {
  await render(
    <HareketKartiGovdesi hareket={hareket} sira={0} setler={[set(1, 80), set(2, 85)]} onSetDuzenle={jest.fn()} />,
  );

  expect(screen.getByLabelText(/^1\. set, .*geçildi/)).toBeTruthy();
  expect(screen.getByLabelText(/^2\. set, /).props.accessibilityLabel).not.toMatch(/geçildi/);
});
