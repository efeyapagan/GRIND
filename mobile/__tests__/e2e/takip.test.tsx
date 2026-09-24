import { screen, fireEvent, within } from '@testing-library/react-native';
import { request } from '@grind/shared/api/client';
import { session } from '../../src/session';
import { sahteBackendOlustur } from '../../src/testUtils/sahteBackend';
import { renderRouterAsync } from '../../src/testUtils/renderRouterAsync';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

const requestMock = request as jest.Mock;

type Iliski = 'Self' | 'None' | 'Following' | 'FollowedBy' | 'Friends';

function profil(username: string, relation: Iliski, ek: Record<string, unknown> = {}) {
  return {
    username,
    displayName: null,
    age: null,
    hasAvatar: false,
    avatarVersion: null,
    friendCount: 1,
    followerCount: 2,
    followingCount: 3,
    relation,
    privacyLevel: 'Acik',
    ...ek,
  };
}

function satir(username: string, relation: Iliski, displayName: string | null = null) {
  return { username, displayName, hasAvatar: false, avatarVersion: null, relation };
}

function sayfa<T>(items: T[]) {
  return { items, page: 1, pageSize: 25, totalCount: items.length, totalPages: 1 };
}

const OTURUM = {
  sessionId: 7,
  startedAt: '2026-09-10T08:00:00Z',
  endedAt: '2026-09-10T09:00:00Z',
  durationSeconds: 3600,
  templateName: 'Push Day',
  difficulty: null,
  totalVolume: 1000,
  setCount: 3,
  medianRestSeconds: null,
  sets: [],
};

/**
 * #284: web'deki `KullaniciProfiliPage`/`TakipListesiPage`/`KullaniciAraPage` testlerinin mobil
 * karşılığı. `/users/...` uçları bu sahte sunucuda yaşar; `takipEdilenler` takip/bırakma ile değişir ve
 * GET yanıtları her seferinde ondan türetilir -- ekran sayıyı/ilişkiyi kendisi hesaplarsa test yakalar.
 * Tanımsız bir `/users/...` isteği hata fırlatır (ör. arkadaş olmayanın geçmişi istenirse).
 */
function takipBackendiKur() {
  const { sahteRequest } = sahteBackendOlustur();
  const istekler: { method: string; path: string }[] = [];
  const takipEdilenler = new Set<string>(['ayse']);
  const takipcilerim = new Set<string>(['ayse', 'can']);

  const iliski = (ad: string): Iliski =>
    takipEdilenler.has(ad) && takipcilerim.has(ad)
      ? 'Friends'
      : takipEdilenler.has(ad)
        ? 'Following'
        : takipcilerim.has(ad)
          ? 'FollowedBy'
          : 'None';

  requestMock.mockImplementation(async (path: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    if (path === '/profile') {
      return {
        username: 'efeypgn',
        displayName: null,
        birthDate: null,
        age: null,
        hasAvatar: false,
        avatarVersion: null,
        privacyLevel: 'Kisitli',
      };
    }
    if (!path.startsWith('/users/')) {
      return sahteRequest(path, init as never);
    }
    istekler.push({ method, path });
    const takip = path.match(/^\/users\/(\w+)\/follow$/);
    if (takip && method === 'POST') {
      takipEdilenler.add(takip[1]!);
      return undefined;
    }
    if (takip && method === 'DELETE') {
      takipEdilenler.delete(takip[1]!);
      return undefined;
    }
    if (path === '/users/efeypgn/profile') {
      return profil('efeypgn', 'Self', { followerCount: takipcilerim.size, followingCount: takipEdilenler.size });
    }
    if (path === '/users/ayse/profile') return profil('ayse', iliski('ayse'), { displayName: 'Ayşe Kaya', age: 24 });
    if (path === '/users/mehmet/profile') {
      return profil('mehmet', iliski('mehmet'), { privacyLevel: 'Gizli' });
    }
    if (path.startsWith('/users/efeypgn/followers')) {
      return sayfa([...takipcilerim].map((ad) => satir(ad, iliski(ad), ad === 'ayse' ? 'Ayşe Kaya' : null)));
    }
    if (path.startsWith('/users/ayse/history')) return sayfa([OTURUM]);
    if (path.startsWith('/users/mehmet/records')) return [];
    if (path.startsWith('/users/search')) return [satir('mehmet', iliski('mehmet'), 'Mehmet Demir')];
    throw new Error(`Tanımsız uç: ${method} ${path}`);
  });

  return istekler;
}

function ileriTarih(msSonra: number): string {
  return new Date(Date.now() + msSonra).toISOString();
}

beforeEach(async () => {
  await session.write('tok', ileriTarih(60_000), 'efeypgn');
});

/** İlk test rotaları soğuk derler (profil.test.tsx ile aynı gerekçe) -- süre ona göre. */
test('Takipciler sayaci listeyi acar; satirlar iliskiye gore ciziler, Geri takip et sonrasi Arkadas olur', async () => {
  const istekler = takipBackendiKur();

  await renderRouterAsync('./app', { initialUrl: '/profile' });

  await fireEvent.press(await screen.findByLabelText('Takipçiler: 2'));

  const ayse = within(await screen.findByTestId('kullanici-satiri-ayse'));
  expect(ayse.getByText('Ayşe Kaya')).toBeTruthy();
  expect(ayse.getByText('Arkadaş')).toBeTruthy();
  expect(ayse.queryByRole('button')).toBeNull();

  await fireEvent.press(within(screen.getByTestId('kullanici-satiri-can')).getByRole('button', { name: 'Geri takip et' }));

  expect(await within(screen.getByTestId('kullanici-satiri-can')).findByText('Arkadaş')).toBeTruthy();
  expect(istekler).toContainEqual({ method: 'POST', path: '/users/can/follow' });
}, 60_000);

test('arkadasin profili: baslik, Takibi birak, yalniz Gecmis ve Rekorlar; gecmis karti silinemez', async () => {
  takipBackendiKur();

  await renderRouterAsync('./app', { initialUrl: '/profile/u/ayse' });

  expect(await screen.findByText('Ayşe Kaya')).toBeTruthy();
  expect(screen.getByText('24 yaş')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Takibi bırak' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Profili düzenle' })).toBeNull();
  expect(screen.getAllByRole('tab').map((sekme) => sekme.props.accessibilityLabel)).toEqual(['Geçmiş', 'Rekorlar']);

  await fireEvent.press(await screen.findByText('Push Day'));

  expect(screen.queryByText(/sil/i)).toBeNull();
}, 20_000);

test('gizli hesapta yalniz Rekorlar sekmesi; gecmis istenmez; Takip et POST atar ve dugme tazelenir', async () => {
  const istekler = takipBackendiKur();

  await renderRouterAsync('./app', { initialUrl: '/profile/u/mehmet' });

  expect(await screen.findByText('Bu hesap gizli — yalnızca rekorlar görünür')).toBeTruthy();
  expect(screen.getAllByRole('tab').map((sekme) => sekme.props.accessibilityLabel)).toEqual(['Rekorlar']);

  await fireEvent.press(screen.getByRole('button', { name: 'Takip et' }));

  expect(await screen.findByRole('button', { name: 'Takibi bırak' })).toBeTruthy();
  expect(istekler).toContainEqual({ method: 'POST', path: '/users/mehmet/follow' });
  expect(istekler.some((istek) => istek.path.startsWith('/users/mehmet/history'))).toBe(false);
}, 20_000);

test('arama ikonundan kullanici aranir ve sonuca dokununca profili acilir', async () => {
  takipBackendiKur();

  await renderRouterAsync('./app', { initialUrl: '/profile' });

  await fireEvent.press(await screen.findByRole('button', { name: 'Kullanıcı ara' }));
  await fireEvent.changeText(await screen.findByLabelText('Kullanıcı ara'), 'meh');
  await fireEvent.press(await screen.findByText('Mehmet Demir'));

  expect(await screen.findByText('Bu hesap gizli — yalnızca rekorlar görünür')).toBeTruthy();
}, 20_000);
