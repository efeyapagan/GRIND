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
    durationSeconds: null,
    recordType: 'Weight',
    rir: null,
    createdAt: new Date(Date.UTC(2026, 8, 26, 10, id)).toISOString(),
    restSeconds: null,
    measurement: 'WeightReps',
  };
}

// #404: gecmis ekraninda da ayni antrenmanda sonradan gecilen rekorun rozeti "gecildi" isaretlenir
// (#401 ile ayni kural); son rekorun rozeti isaretsiz kalir.
test('gecmiste sonradan gecilen kilo rekorunun rozeti "geçildi" diye okunur, son rekor okunmaz', async () => {
  await render(<SetList varyant="gecmis" sets={[set(1, 80), set(2, 85)]} />);

  expect(screen.getAllByLabelText('Ağırlık rekoru, geçildi')).toHaveLength(1);
  expect(screen.getAllByText('Ağırlık rekoru')).toHaveLength(2);
});

/**
 * #591: gecmis gorunumu gecmis detay panelinin CAMINDA cizilir -- set satiri opak `surface-1` kutu
 * cizmez. #615: hafif dolgu da kutu gibi okunuyordu -- satirlar dolgusuz, aralarinda sac teli cizgi;
 * tek dolgu hareket adinin yanindaki "N SET" etiketininkidir.
 */
test('gecmiste set satiri kutu cizmez, satirlar cizgiyle ayrilir', async () => {
  await render(<SetList varyant="gecmis" sets={[set(1, 80), set(2, 85)]} />);

  expect(screen.getByTestId('gecmis-set-1').props.className).not.toMatch(/bg-surface/);
  expect(screen.getAllByTestId('cam-dolgu')).toHaveLength(1);
  expect(screen.getAllByTestId('cam-ayirici')).toHaveLength(1);
});

/**
 * #591: sablonsuz antrenmanda hareket grubu duz `surface-1` degil cam kart (hareket kartiyla ayni kose).
 * #615: icindeki set satirlari da dolgusuz, cizgiyle ayrilir; tek dolgu sira karosununkidir.
 */
test('antrenmanda hareket grubu cam yuzeydedir, set satirlari cizgiyle ayrilir', async () => {
  await render(<SetList sets={[set(1, 80), set(2, 85)]} onSetDuzenle={jest.fn()} />);

  const sinif: string = screen.getByTestId('set-grubu-1').props.className;
  expect(sinif).toContain('rounded-xl');
  expect(sinif).not.toMatch(/bg-surface/);
  expect(screen.getAllByTestId('cam-dolgu')).toHaveLength(1);
  expect(screen.getAllByTestId('cam-ayirici')).toHaveLength(1);
});
