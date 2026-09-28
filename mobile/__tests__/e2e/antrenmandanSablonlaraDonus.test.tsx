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

/**
 * #487 (kullanici bildirdi): "workout baslatinca geri cikamiyorum sablonlar ekranina". Antrenman
 * ekrani bir sekme koku oldugu icin ust barda geri tusu yok (#466) ve baska cikis da yoktu.
 * Cikis "Devam ediyor" rozetinin SOLUNDA durur; GERCEK rotalarla dogrulanir, yalnizca ag katmani
 * sahte.
 */
test('acik antrenmandan Sablonlarima donulur', async () => {
  await session.write('tok', new Date(Date.now() + 60_000).toISOString(), 'efe');
  const { sahteRequest, state } = sahteBackendOlustur();
  state.sablonlar.push({ id: 1, name: 'Push Day', createdAt: new Date().toISOString(), exercises: [] });
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

  await fireEvent.press(await screen.findByLabelText('Şablonlarıma dön'));

  // Sablonlar ekrani acilir ve #480'in karti orada antrenmanin surdugunu soyler.
  expect(await screen.findByText('Yeni şablon')).toBeTruthy();
  expect(screen.getByText('Devam ediyor')).toBeTruthy();
}, 20_000);
