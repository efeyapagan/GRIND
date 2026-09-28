import { screen, fireEvent } from '@testing-library/react-native';
import { request } from '@grind/shared/api/client';
import { session } from '../../src/session';
import { sahteBackendOlustur } from '../../src/testUtils/sahteBackend';
import { renderRouterAsync } from '../../src/testUtils/renderRouterAsync';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

/** Acik bir antrenmanla antrenman ekranini acar (gercek rotalar, yalnizca ag katmani sahte). */
async function acikAntrenmanlaAc() {
  await session.write('tok', new Date(Date.now() + 60_000).toISOString(), 'efe');
  const { sahteRequest, state } = sahteBackendOlustur();
  state.sablonlar.push({
    id: 1,
    name: 'Push Day',
    createdAt: new Date().toISOString(),
    exercises: [],
  });
  state.acikOturum = {
    id: 1,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    durationSeconds: null,
    templateId: 1,
    templateName: 'Push Day',
    progress: [],
  };
  requestMock.mockImplementation(sahteRequest);
  await renderRouterAsync('./app', { initialUrl: '/antrenman' });
  return state;
}

/**
 * #487'de eklenen cikis #494'te yon degistirdi (kullanici karari): hedef Sablonlarim DEGIL, bu
 * ekranin "Antrenmana basla" gorunumu. Oturum ACIK kalir -- ustte ana sayfadaki kartin aynisi
 * durur ve "Devam et" antrenmana geri cevirir.
 */
test('geri tusu baslatma gorunumunu acar, Devam et antrenmana geri cevirir', async () => {
  const state = await acikAntrenmanlaAc();

  await fireEvent.press(await screen.findByLabelText('Antrenmana başla ekranına dön'));

  expect(await screen.findByText('Şablonlarım')).toBeTruthy();
  expect(screen.getByText('Devam ediyor')).toBeTruthy();
  // Antrenman KAPANMADI: gorunum degisti, oturum yerinde.
  expect(state.acikOturum).not.toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Devam et' }));

  expect(await screen.findByText('Hareket ekle')).toBeTruthy();
  expect(screen.queryByText('Şablonlarım')).toBeNull();
}, 20_000);

/**
 * Acik antrenman varken ikinci bir antrenman baslatilmaz: TUM baslatma dugmeleri soluk ve
 * basilamaz (kullanici karari) -- sablon kartlari da "Bos antrenman baslat" da.
 */
test('baslatma gorunumunde baslatma dugmeleri basilamaz', async () => {
  const state = await acikAntrenmanlaAc();
  const oncekiOturum = state.acikOturum;

  await fireEvent.press(await screen.findByLabelText('Antrenmana başla ekranına dön'));
  await screen.findByText('Şablonlarım');

  await fireEvent.press(screen.getByRole('button', { name: 'Başla' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Boş antrenman başlat' }));

  // Hicbiri yeni oturum acmadi ve ekran baslatma gorunumunde kaldi.
  expect(state.acikOturum).toBe(oncekiOturum);
  expect(screen.getByText('Şablonlarım')).toBeTruthy();
}, 20_000);
