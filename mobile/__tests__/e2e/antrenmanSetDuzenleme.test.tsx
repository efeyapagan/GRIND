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

/** Bench Press'te bir seti (60 kg × 8) girilmis acik antrenman. */
async function setliAntrenmanlaAc() {
  const { sahteRequest, state } = sahteBackendOlustur();
  state.acikOturum = {
    id: 1,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: null,
    templateName: null,
    progress: [{ exerciseId: 1, exerciseName: 'Bench Press', plannedSets: 4, completedSets: 1, restSeconds: 90 }],
  };
  state.setler = [
    {
      id: 7,
      sessionId: 1,
      exerciseId: 1,
      exerciseName: 'Bench Press',
      exercisePosition: 1,
      weight: 60,
      reps: 8,
      recordType: 'None',
      rir: 2,
      createdAt: new Date().toISOString(),
      restSeconds: null,
    },
  ];
  requestMock.mockImplementation(sahteRequest);
  await renderRouterAsync('./app', { initialUrl: '/antrenman' });
  await screen.findByLabelText(/^1\. set, /);
  return state;
}

/**
 * #396: set duzenleyici artik satirin yerinde acilmaz; ekranin ortasinda, set paneliyle ayni cam
 * yuzeyde acilir. Duzenlemede "Set ekle" paneli yoktur -- odak karti + alt panel duzeni altta bos
 * bir alan birakirdi.
 */
test('listedeki sete dokununca alanlari dolu, ortalanmis duzenleyici acilir', async () => {
  await setliAntrenmanlaAc();

  await fireEvent.press(screen.getByLabelText(/^1\. set, /));

  const duzenleyici = await screen.findByTestId('set-duzenleyici');
  expect(within(duzenleyici).getByLabelText('Ağırlık').props.value).toBe('60');
  expect(within(duzenleyici).getByLabelText('Tekrar').props.value).toBe('8');
  expect(screen.queryByTestId('odak-karti')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Set ekle' })).toBeNull();
}, 20_000);

test('kaydedince duzeltme sunucuya gider ve duzenleyici kapanir', async () => {
  const state = await setliAntrenmanlaAc();
  await fireEvent.press(screen.getByLabelText(/^1\. set, /));
  const duzenleyici = await screen.findByTestId('set-duzenleyici');

  await fireEvent.changeText(within(duzenleyici).getByLabelText('Ağırlık'), '62.5');
  await fireEvent.press(within(duzenleyici).getByRole('button', { name: 'Kaydet' }));

  await waitFor(() => expect(screen.queryByTestId('set-duzenleyici')).toBeNull());
  expect(state.setler[0].weight).toBe(62.5);
}, 20_000);

test('perdeye dokununca duzenleyici kaydetmeden kapanir', async () => {
  const state = await setliAntrenmanlaAc();
  await fireEvent.press(screen.getByLabelText(/^1\. set, /));
  const duzenleyici = await screen.findByTestId('set-duzenleyici');
  await fireEvent.changeText(within(duzenleyici).getByLabelText('Ağırlık'), '100');

  await fireEvent.press(screen.getByLabelText('Düzenlemeyi kapat'));

  await waitFor(() => expect(screen.queryByTestId('set-duzenleyici')).toBeNull());
  expect(state.setler[0].weight).toBe(60);
}, 20_000);

// Odak modundan gelinen duzenleme bitince kullanici geldigi yere -- odak karti + set paneline -- doner.
test('odak kartindaki sete dokununca duzenleyici acilir, vazgecince odak karti ve set paneli geri gelir', async () => {
  await setliAntrenmanlaAc();
  await fireEvent.press(screen.getByLabelText(/^Bench Press, /));
  const odak = await screen.findByTestId('odak-karti');

  await fireEvent.press(within(odak).getByLabelText(/^1\. set, /));

  const duzenleyici = await screen.findByTestId('set-duzenleyici');
  expect(screen.queryByRole('button', { name: 'Set ekle' })).toBeNull();
  await fireEvent.press(within(duzenleyici).getByRole('button', { name: 'Vazgeç' }));

  await waitFor(() => expect(screen.queryByTestId('set-duzenleyici')).toBeNull());
  expect(screen.getByTestId('odak-karti')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Set ekle' })).toBeTruthy();
}, 20_000);

test('seti silince duzenleyici kapanir ve geri alma seridi cikar', async () => {
  await setliAntrenmanlaAc();
  await fireEvent.press(screen.getByLabelText(/^1\. set, /));
  const duzenleyici = await screen.findByTestId('set-duzenleyici');

  await fireEvent.press(within(duzenleyici).getByRole('button', { name: 'Seti sil' }));

  await waitFor(() => expect(screen.queryByTestId('set-duzenleyici')).toBeNull());
  expect(screen.getByText('Set silindi')).toBeTruthy();
  expect(screen.queryByLabelText(/^1\. set, /)).toBeNull();
}, 20_000);
