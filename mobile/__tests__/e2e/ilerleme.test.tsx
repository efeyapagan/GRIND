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

const PROFIL = {
  username: 'efeypgn', displayName: 'Efe Yapağan', birthDate: null, age: null,
  hasAvatar: false, avatarVersion: null, privacyLevel: 'Kisitli',
};

function kur(haftalar: unknown[]) {
  const { sahteRequest } = sahteBackendOlustur();
  requestMock.mockImplementation(async (path: string, init: RequestInit = {}) => {
    if (path === '/profile') return PROFIL;
    if (path === '/users/efeypgn/profile') {
      return {
        username: 'efeypgn', displayName: 'Efe Yapağan', age: null, hasAvatar: false, avatarVersion: null,
        friendCount: 0, followerCount: 0, followingCount: 0, relation: 'Self', privacyLevel: 'Kisitli',
      };
    }
    if (path === '/stats/weekly') return { weeks: haftalar };
    if (path === '/stats/overreaching') return { signal: null };
    if (path.startsWith('/stats/volume/by-exercise')) return { from: null, to: null, totalVolume: 0, items: [] };
    return sahteRequest(path, init as never);
  });
}

beforeEach(async () => {
  await session.write('tok', new Date(Date.now() + 60_000).toISOString(), 'efeypgn');
});

test('profildeki Ilerleme sekmesi uc karti acar', async () => {
  kur([
    { weekStart: '2026-03-02', volume: 5000, pushSets: 6, pullSets: 4, legsSets: 3, otherSets: 1 },
    { weekStart: '2026-03-09', volume: 50, pushSets: 8, pullSets: 4, legsSets: 1, otherSets: 0 },
  ]);
  await renderRouterAsync('./app', { initialUrl: '/profile' });

  await fireEvent.press(await screen.findByLabelText('İlerleme'));

  expect(await screen.findByText('Haftalık hacim')).toBeTruthy();
  expect(screen.getByText('Kas grubuna göre setler')).toBeTruthy();
  expect(screen.getByText('Tahmini 1RM')).toBeTruthy();
}, 20_000);

test('hic set yoksa kartlar yerine bos durum', async () => {
  kur([]);
  await renderRouterAsync('./app', { initialUrl: '/profile/progress' });

  expect(await screen.findByText('Antrenman kaydettikçe ilerlemen burada görünür.')).toBeTruthy();
  expect(screen.queryByText('Haftalık hacim')).toBeNull();
}, 20_000);
