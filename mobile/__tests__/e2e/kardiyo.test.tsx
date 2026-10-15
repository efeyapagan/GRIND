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

const TREADMILL = {
  id: 193,
  name: 'Treadmill',
  alternateName: 'Koşu bandı',
  category: 'Cardio',
  measurement: 'Cardio',
  isArchived: false,
  cardioFields: ['Speed', 'Incline', 'Distance'],
};

beforeEach(async () => {
  await session.write('tok', new Date(Date.now() + 60_000).toISOString(), 'efe');
});

/**
 * Sahte backend'e kardiyo uclari: kayitlar bellekte, Durdur sureyi baslangictan 20 dk sonra keser (sunucunun
 * hesabi), rekor rozetini sunucu verir.
 */
function kardiyoluBackend() {
  const { sahteRequest, state } = sahteBackendOlustur();
  const kardiyolar: any[] = [];
  state.acikOturum = {
    id: 1,
    startedAt: new Date().toISOString(),
    endedAt: null,
    isOpen: true,
    templateId: null,
    templateName: null,
    progress: [{ exerciseId: 193, exerciseName: 'Treadmill', plannedSets: 1, completedSets: 0, restSeconds: 0 }],
  };
  requestMock.mockImplementation(async (path: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const govde = init.body ? JSON.parse(init.body as string) : undefined;
    if (method === 'GET' && path === '/exercises') return [TREADMILL];
    if (method === 'GET' && path === '/sessions/1/cardio') return kardiyolar;
    if (method === 'POST' && path === '/sessions/1/cardio') {
      const kayit = {
        id: 50, sessionId: 1, exerciseId: 193, exerciseName: 'Treadmill',
        startedAt: new Date(Date.now() - 20 * 60_000).toISOString(), durationSeconds: null,
        ...govde, isDurationRecord: false, isDistanceRecord: false,
      };
      kardiyolar.push(kayit);
      return kayit;
    }
    if (method === 'POST' && path === '/cardio/50/stop') {
      Object.assign(kardiyolar[0], govde, { durationSeconds: 1200, isDurationRecord: true });
      state.acikOturum.progress[0].completedSets = 1;
      return kardiyolar[0];
    }
    if (method === 'PUT' && path === '/cardio/50') {
      Object.assign(kardiyolar[0], govde, { isDistanceRecord: true });
      return kardiyolar[0];
    }
    return sahteRequest(path, init as any);
  });
  return kardiyolar;
}

/**
 * #647: kardiyo karti hareket gibi listede durur; karta basinca ayarlar + Baslat, akarken Durdur, durunca
 * sonuclar + Kaydet. Yalnizca kardiyo yapilmis antrenman bos sayilmaz -- "iptal et" degil "bitir" gorunur.
 */
test('kardiyo baslatilir, durdurulur, sonuclari kaydedilir; antrenman bitirilebilir', async () => {
  const kardiyolar = kardiyoluBackend();
  await renderRouterAsync('./app', { initialUrl: '/antrenman' });

  expect(await screen.findByText('Antrenmanı iptal et')).toBeTruthy();
  await fireEvent.press(await screen.findByLabelText('Treadmill'));

  await fireEvent.changeText(await screen.findByLabelText('Hız'), '9');
  expect(screen.queryByLabelText('Mesafe')).toBeNull();
  await fireEvent.press(screen.getByText('Başlat'));
  await waitFor(() => expect(kardiyolar).toHaveLength(1));
  expect(kardiyolar[0]).toMatchObject({ exerciseId: 193, speedKmh: 9 });

  await fireEvent.press(await screen.findByText('Durdur'));
  await fireEvent.changeText(await screen.findByLabelText('Mesafe'), '3,2');
  await fireEvent.press(screen.getByText('Kaydet'));

  await waitFor(() => expect(kardiyolar[0]).toMatchObject({ durationSeconds: 1200, distanceKm: 3.2 }));
  expect(await screen.findByText('Antrenmanı bitir')).toBeTruthy();
  expect(screen.queryByText('Antrenmanı iptal et')).toBeNull();
  expect((await screen.findAllByText('Mesafe rekoru')).length).toBeGreaterThan(0);
}, 20_000);
