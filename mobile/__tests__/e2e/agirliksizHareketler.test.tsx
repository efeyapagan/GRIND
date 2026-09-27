import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { request } from '@grind/shared/api/client';
import { session } from '../../src/session';
import { sahteBackendOlustur } from '../../src/testUtils/sahteBackend';
import { renderRouterAsync } from '../../src/testUtils/renderRouterAsync';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

beforeEach(async () => {
  await session.write('tok', new Date(Date.now() + 60_000).toISOString(), 'efe');
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Tek hareketli (henuz seti olmayan) acik antrenman; hareketin olcum tipi `olcum`. */
async function antrenmanlaAc(olcum: 'Reps' | 'Duration', ad: string) {
  const { sahteRequest, state } = sahteBackendOlustur({ olcum });
  state.acikOturum = {
    id: 1,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: null,
    templateName: null,
    progress: [{ exerciseId: 1, exerciseName: ad, plannedSets: 3, completedSets: 0, restSeconds: 0 }],
  };
  requestMock.mockImplementation(sahteRequest);
  await renderRouterAsync('./app', { initialUrl: '/antrenman' });
  await fireEvent.press(await screen.findByLabelText(new RegExp(`${ad}, 0 / 3 set`)));
  return state;
}

/**
 * #346: agirliksiz harekette (crunch) kilo "ek agirlik"tir ve bos birakilabilir, RIR sorulmaz; set
 * "20 tekrar" diye listelenir, "0 kg × 20" diye degil.
 */
test('agirliksiz harekette yalnizca tekrar girilir, RIR sorulmaz', async () => {
  const state = await antrenmanlaAc('Reps', 'Crunch');

  expect(await screen.findByLabelText('Ek ağırlık')).toBeTruthy();
  expect(screen.queryByLabelText('RIR (opsiyonel): girilmedi')).toBeNull();

  await fireEvent.changeText(screen.getByLabelText('Tekrar'), '20');
  await fireEvent.press(screen.getByRole('button', { name: 'Set ekle' }));

  await waitFor(() => expect(state.setler).toHaveLength(1));
  expect(state.setler[0]).toMatchObject({ weight: 0, reps: 20, rir: null, durationSeconds: null });
  // #385: odak karti acik kaldigi icin set hem listedeki kartta hem odak kartinda gorunur.
  expect((await screen.findAllByLabelText(/^1\. set, 20 tekrar/)).length).toBeGreaterThan(0);
}, 20_000);

/**
 * #346: sureli harekette (plank) kilo ve tekrar yok; kronometre durdurulunca gecen sure saniye kutusuna
 * yazilir ve set yalnizca sureyle kaydedilir.
 */
test('sureli harekette kronometre sureyi yazar, set yalnizca sureyle kaydedilir', async () => {
  const state = await antrenmanlaAc('Duration', 'Plank');

  expect(screen.queryByLabelText('Tekrar')).toBeNull();
  expect(screen.queryByLabelText('Ağırlık')).toBeNull();

  const baslangic = Date.now();
  jest.spyOn(Date, 'now').mockReturnValue(baslangic);
  await fireEvent.press(await screen.findByTestId('kronometre'));
  jest.spyOn(Date, 'now').mockReturnValue(baslangic + 45_000);
  await fireEvent.press(screen.getByTestId('kronometre'));
  jest.restoreAllMocks();

  expect(screen.getByLabelText('Süre').props.value).toBe('45');
  await fireEvent.press(screen.getByRole('button', { name: 'Set ekle' }));

  await waitFor(() => expect(state.setler).toHaveLength(1));
  expect(state.setler[0]).toMatchObject({ weight: 0, reps: null, rir: null, durationSeconds: 45 });
  expect((await screen.findAllByLabelText(/^1\. set, 0:45/)).length).toBeGreaterThan(0);
}, 20_000);
