import { Keyboard } from 'react-native';
import { screen, fireEvent, waitFor, within } from '@testing-library/react-native';
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

async function acikAntrenmanlaAc(plannedSets: number | null = 4, completedSets = 0) {
  const { sahteRequest, state } = sahteBackendOlustur();
  state.acikOturum = {
    id: 1,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: null,
    templateName: null,
    progress: [{ exerciseId: 1, exerciseName: 'Bench Press', plannedSets, completedSets, restSeconds: 90 }],
  };
  requestMock.mockImplementation(sahteRequest);
  await renderRouterAsync('./app', { initialUrl: '/antrenman' });
  await screen.findByLabelText(/^Bench Press, /);
  return state;
}

/** Karti acar, bir set girer ve setin sunucuya ulasip ilerlemenin tazelenmesini bekler. */
async function kartiAcipSetEkle(state: { setler: unknown[] }, sonrakiSayac: RegExp) {
  await fireEvent.press(screen.getByLabelText(/^Bench Press, /));
  await screen.findByTestId('odak-karti');
  await fireEvent.changeText(screen.getByLabelText('Ağırlık'), '60');
  await fireEvent.changeText(screen.getByLabelText('Tekrar'), '8');
  await fireEvent.press(screen.getByRole('button', { name: 'Set ekle' }));
  await waitFor(() => expect(state.setler).toHaveLength(1));
  await waitFor(() => expect(screen.getAllByLabelText(sonrakiSayac).length).toBeGreaterThan(0));
}

/**
 * #354: secili hareket artik listede yerinde acilmaz; karta dokununca hareketin ayrintilari
 * (gecmis, siralama, kaldirma) set paneliyle birlikte ekrani kaplayan cam odak kartinda gorunur.
 */
test('liste karti yerinde acilmaz, karta dokununca odak karti set paneliyle acilir', async () => {
  await acikAntrenmanlaAc();
  expect(screen.queryByText('Hareketi kaldır')).toBeNull();

  await fireEvent.press(screen.getByLabelText(/Bench Press, 0 \/ 4 set/));

  const odak = await screen.findByTestId('odak-karti');
  expect(within(odak).getByText('Bench Press')).toBeTruthy();
  expect(screen.getByText('Hareketi kaldır')).toBeTruthy();
  expect(screen.getByLabelText('Ağırlık')).toBeTruthy();
}, 20_000);

// #357: uzun hareket adi "Yeni set: <ad>" basligini tasirip kapatma dugmesini ekrandan itiyordu.
test('set panelinin basligi yalnizca hareket adidir, kapatma dugmesi panelde degil', async () => {
  await acikAntrenmanlaAc();
  await fireEvent.press(screen.getByLabelText(/Bench Press, 0 \/ 4 set/));
  await screen.findByTestId('odak-karti');

  const panel = screen.getByTestId('set-paneli');
  expect(within(panel).getByText('Bench Press')).toBeTruthy();
  expect(within(panel).queryByText(/Yeni set/)).toBeNull();
  expect(within(panel).queryByRole('button', { name: 'Paneli kapat' })).toBeNull();
}, 20_000);

test('odak kartinin kapatma dugmesi karti ve set panelini birlikte kapatir', async () => {
  await acikAntrenmanlaAc();
  await fireEvent.press(screen.getByLabelText(/Bench Press, 0 \/ 4 set/));
  const odak = await screen.findByTestId('odak-karti');

  await fireEvent.press(within(odak).getByRole('button', { name: 'Paneli kapat' }));

  await waitFor(() => expect(screen.queryByTestId('odak-karti')).toBeNull());
  expect(screen.queryByLabelText('Ağırlık')).toBeNull();
}, 20_000);

test('kartin disindaki bosluga dokununca odak karti ve set paneli kapanir', async () => {
  await acikAntrenmanlaAc();
  await fireEvent.press(screen.getByLabelText(/Bench Press, 0 \/ 4 set/));
  await screen.findByTestId('odak-karti');

  await fireEvent.press(screen.getByLabelText('Kartı kapat'));

  await waitFor(() => expect(screen.queryByTestId('odak-karti')).toBeNull());
  expect(screen.queryByLabelText('Ağırlık')).toBeNull();
}, 20_000);

/**
 * #385: set eklenince panel artik kapanmaz -- hedefe kadar her set icin karta yeniden basmak
 * gerekiyordu. Panel ilk acildigi hale doner: klavye kapanir, alanlar bosalir.
 */
test('hedef tamamlanmadan set eklenince panel acik kalir ve ilk acildigi hale doner', async () => {
  const klavyeKapat = jest.spyOn(Keyboard, 'dismiss');
  const state = await acikAntrenmanlaAc(4, 0);

  await kartiAcipSetEkle(state, /Bench Press, 1 \/ 4 set/);

  expect(screen.getByTestId('odak-karti')).toBeTruthy();
  expect(screen.getByLabelText('Ağırlık').props.value).toBe('');
  expect(screen.getByLabelText('Tekrar').props.value).toBe('');
  expect(klavyeKapat).toHaveBeenCalled();
  klavyeKapat.mockRestore();
}, 20_000);

test('hedefi tamamlayan set eklenince odak karti ve panel kapanir', async () => {
  const state = await acikAntrenmanlaAc(4, 3);

  await kartiAcipSetEkle(state, /Bench Press, 4 \/ 4 set/);

  await waitFor(() => expect(screen.queryByTestId('odak-karti')).toBeNull());
  expect(screen.queryByLabelText('Ağırlık')).toBeNull();
}, 20_000);

// Hedef zaten doluyken fazladan set icin kart bilerek acildi: kapanma hedefe ULASILAN sette olur.
test('hedef zaten doluyken eklenen fazladan setten sonra panel acik kalir', async () => {
  const state = await acikAntrenmanlaAc(4, 4);

  await kartiAcipSetEkle(state, /Bench Press, 5 \/ 4 set/);

  expect(screen.getByTestId('odak-karti')).toBeTruthy();
}, 20_000);

test('hedefsiz harekette set eklenince panel acik kalir', async () => {
  const state = await acikAntrenmanlaAc(null, 0);

  await kartiAcipSetEkle(state, /Bench Press, 1 set/);

  expect(screen.getByTestId('odak-karti')).toBeTruthy();
}, 20_000);
