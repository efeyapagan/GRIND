import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { request } from '@grind/shared/api/client';
import * as ImagePicker from 'expo-image-picker';
import { session } from '../../src/session';
import { sahteBackendOlustur } from '../../src/testUtils/sahteBackend';
import { renderRouterAsync } from '../../src/testUtils/renderRouterAsync';

jest.mock('@grind/shared/api/client', () => {
  const actual = jest.requireActual('@grind/shared/api/client');
  return { ...actual, request: jest.fn() };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

/** Yeni zincirleme API: manipulate(uri).resize(...).renderAsync() -> saveAsync({ format }). */
const mockBoyutlandir = jest.fn();
const mockKaydet = jest.fn(async () => ({ uri: 'file:///kucuk.jpg', width: 256, height: 256 }));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn(() => {
      const baglam = {
        resize: (boyut: unknown) => {
          mockBoyutlandir(boyut);
          return baglam;
        },
        renderAsync: async () => ({ saveAsync: mockKaydet }),
      };
      return baglam;
    }),
  },
  SaveFormat: { JPEG: 'jpeg' },
}));

/**
 * expo/fetch (Expo 57'nin global fetch'i) RN'in eski `{ uri, name, type }` FormData parcasini desteklemez
 * ("Unsupported FormDataPart") -- dosya `expo-file-system`'in Blob uyumlu `File`'i olarak eklenmeli.
 */
jest.mock('expo-file-system', () => ({
  File: class MockDosya {
    uri: string;
    constructor(mockUri: string) {
      this.uri = mockUri;
    }
    bytes() {
      return Promise.resolve(new Uint8Array());
    }
  },
}));

const requestMock = request as jest.Mock;
const galeriMock = ImagePicker.launchImageLibraryAsync as jest.Mock;

const PROFIL = {
  username: 'efeypgn',
  displayName: 'Efe Yapağan',
  birthDate: '2001-05-04',
  age: 25,
  hasAvatar: false,
  avatarVersion: null,
};

/**
 * Issue #283: sahte backend'e profil uçları eklenir; gönderilen gövdeler `istekler`de toplanır.
 * FormData JSON değildir -- avatar isteği asıl sahte backend'e hiç ulaşmaz.
 */
function profilBackendiKur(baslangic: Partial<typeof PROFIL> = {}) {
  const { sahteRequest } = sahteBackendOlustur();
  const istekler: { method: string; path: string; body: unknown }[] = [];
  let profil = { ...PROFIL, ...baslangic };

  requestMock.mockImplementation(async (path: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    if (path === '/profile' || path.startsWith('/profile/') || path.startsWith('/users/')) {
      istekler.push({ method, path, body: init.body });
    }
    if (method === 'GET' && path === '/profile') return profil;
    if (method === 'PUT' && path === '/profile') {
      profil = { ...profil, ...JSON.parse(init.body as string) };
      return profil;
    }
    if (path === '/profile/avatar') return undefined;
    if (method === 'GET' && path === '/users/efeypgn/profile') {
      return { username: 'efeypgn', friendCount: 3, followerCount: 12, followingCount: 7, relation: 'Self' };
    }
    return sahteRequest(path, init as never);
  });

  return istekler;
}

function ileriTarih(msSonra: number): string {
  return new Date(Date.now() + msSonra).toISOString();
}

beforeEach(async () => {
  await session.write('tok', ileriTarih(60_000), 'efeypgn');
});

test('Profil acilinca baslik ve Gecmis sekmesi secili gelir; Hesap sekmesi yok', async () => {
  profilBackendiKur();

  await renderRouterAsync('./app', { initialUrl: '/profile' });

  expect(await screen.findByText('Efe Yapağan')).toBeTruthy();
  expect(screen.getByText('efeypgn')).toBeTruthy();
  expect(screen.getByText('25 yaş')).toBeTruthy();
  expect(screen.getByLabelText('Arkadaşlar: 3')).toBeTruthy();
  expect(screen.getByLabelText('Takipçiler: 12')).toBeTruthy();
  expect(screen.getByLabelText('Takip edilenler: 7')).toBeTruthy();

  const sekmeler = screen.getAllByRole('tab');
  expect(sekmeler.map((sekme) => sekme.props.accessibilityLabel)).toEqual(['Geçmiş', 'Rekorlar', 'Ölçüler']);
  expect(screen.getByRole('tab', { name: 'Geçmiş' }).props.accessibilityState).toEqual({ selected: true });
}, 20_000);

test('Hesap ayarlari dugmesi sekmesiz hesap ekranini acar', async () => {
  profilBackendiKur();

  await renderRouterAsync('./app', { initialUrl: '/profile' });

  await fireEvent.press(await screen.findByRole('button', { name: 'Hesap ayarları' }));

  expect(await screen.findByText('Şifre değiştir')).toBeTruthy();
  expect(screen.queryAllByRole('tab')).toHaveLength(0);
}, 20_000);

test('Profili duzenle ile isim kaydedilince PUT gider ve baslik yeni ismi gosterir', async () => {
  const istekler = profilBackendiKur();

  await renderRouterAsync('./app', { initialUrl: '/profile' });

  await fireEvent.press(await screen.findByRole('button', { name: 'Profili düzenle' }));
  const isim = await screen.findByLabelText('Görünen isim');
  await fireEvent.changeText(isim, 'Efe Y.');
  await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

  expect(await screen.findByText('Efe Y.')).toBeTruthy();
  const put = istekler.find((istek) => istek.method === 'PUT' && istek.path === '/profile');
  expect(JSON.parse(put!.body as string)).toEqual({ displayName: 'Efe Y.', birthDate: '2001-05-04' });
}, 20_000);

test('galeriden secilen fotograf 256 piksele kucultulup multipart yuklenir', async () => {
  const istekler = profilBackendiKur();
  const ekle = jest.spyOn(FormData.prototype, 'append');
  galeriMock.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///buyuk.png', width: 2000, height: 2000 }] });

  await renderRouterAsync('./app', { initialUrl: '/profile/edit' });

  await fireEvent.press(await screen.findByRole('button', { name: 'Fotoğraf seç' }));

  await waitFor(() => expect(istekler.some((istek) => istek.path === '/profile/avatar')).toBe(true));
  const yukleme = istekler.find((istek) => istek.path === '/profile/avatar')!;
  expect(yukleme.method).toBe('PUT');
  expect(yukleme.body).toBeInstanceOf(FormData);
  const { File: MockDosya } = jest.requireMock('expo-file-system');
  expect(ekle).toHaveBeenCalledWith('file', expect.any(MockDosya));
  expect((ekle.mock.calls[0][1] as unknown as { uri: string }).uri).toBe('file:///kucuk.jpg');
  const { ImageManipulator } = jest.requireMock('expo-image-manipulator');
  expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file:///buyuk.png');
  expect(mockBoyutlandir).toHaveBeenCalledWith({ width: 256, height: 256 });
  expect(mockKaydet).toHaveBeenCalledWith(expect.objectContaining({ format: 'jpeg' }));
}, 20_000);

/**
 * Android'in resim yükleyicisi `Image` kaynağındaki `headers`'ı isteğe eklemiyor: fotoğraf ucu 401 dönüyor
 * ve daire boş kalıyordu (Pixel 8 emülatöründe görüldü). Resim kimlikli bir fetch'le çekilir, `Image`'a
 * data URL verilir -- web'le aynı yol.
 */
test('fotograf varsa kimlikli istekle cekilip Image a data URL olarak verilir', async () => {
  profilBackendiKur({ hasAvatar: true, avatarVersion: 42 } as never);
  const fetchMock = jest.fn(async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'image/jpeg' },
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  }));
  const gercekFetch = globalThis.fetch;
  globalThis.fetch = fetchMock as never;

  try {
    await renderRouterAsync('./app', { initialUrl: '/profile' });

    const foto = await screen.findByLabelText('Profil fotoğrafı');
    expect(foto.props.source).toEqual({ uri: 'data:image/jpeg;base64,AQID' });
    const [adres, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(adres).toMatch(/\/users\/efeypgn\/avatar\?v=42$/);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  } finally {
    globalThis.fetch = gercekFetch;
  }
}, 20_000);
