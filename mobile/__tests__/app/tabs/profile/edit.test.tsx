import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import { ApiError } from '@grind/shared/api/problem';
import {
  useProfilim,
  useProfiliGuncelle,
  useFotografiYukle,
  useFotografiKaldir,
  useKullaniciAdiUygunMu,
} from '@grind/shared/api/queries';
import { useAuth } from '../../../../src/auth/AuthContext';
import { UYGUNLUK_GECIKMESI_MS } from '../../../../src/components/KullaniciAdiPenceresi';
import ProfiliDuzenleScreen from '../../../../app/(tabs)/profile/edit';

jest.mock('@grind/shared/api/queries', () => ({
  useProfilim: jest.fn(),
  useProfiliGuncelle: jest.fn(),
  useFotografiYukle: jest.fn(),
  useFotografiKaldir: jest.fn(),
  useKullaniciAdiUygunMu: jest.fn(),
  useProfilFotografi: () => ({ data: null }),
}));
jest.mock('../../../../src/auth/AuthContext', () => ({ useAuth: jest.fn() }));

// #510: fotograf akisinin uc yerel adimi -- galeri, kucultme, dosya. Testte ne dondurecekleri
// (ya da hangi adimda patlayacaklari) her testte ayrica belirlenir.
const mockGaleri = jest.fn();
const mockKucult = jest.fn();
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: () => mockGaleri() }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize: () => ({ renderAsync: () => mockKucult() }),
    }),
  },
}));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));

const updateProfile = jest.fn();
const uygunMuMock = useKullaniciAdiUygunMu as jest.Mock;

beforeEach(() => {
  updateProfile.mockReset().mockResolvedValue(undefined);
  uygunMuMock.mockReset().mockReturnValue({ data: undefined, isPending: false, isError: false });
  (useProfilim as jest.Mock).mockReturnValue({
    data: { username: 'ada', displayName: 'Ada', birthDate: null, hasAvatar: false, avatarVersion: null },
    isError: false,
  });
  (useProfiliGuncelle as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  (useFotografiYukle as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  (useFotografiKaldir as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
  (useAuth as jest.Mock).mockReturnValue({ username: 'ada', updateProfile, logout: jest.fn() });
});

async function ciz() {
  return render(
    <PageTitleProvider>
      <ProfiliDuzenleScreen />
    </PageTitleProvider>,
  );
}

/** #372: kimlik bilgilerinin tamami bu ekranda ve SIRASI kullanicinin istedigi gibi. */
test('kartlar sirasiyla gorunen isim, kullanici adi, dogum tarihi, sifre degistir', async () => {
  await ciz();

  expect(screen.getByTestId('profil-gorunen-isim')).toBeTruthy();
  expect(screen.getByText('@ada')).toBeTruthy();
  expect(screen.getByLabelText('Doğum tarihi')).toBeTruthy();
  // #378: sifre degistirme hesap ayarlarina tasindi.
  expect(screen.queryByText('Şifre değiştir')).toBeNull();
});

test('kalem ikonu kullanici adi penceresini acar, mevcut ad duz metin', async () => {
  await ciz();

  await act(async () => fireEvent.press(screen.getByLabelText('Kullanıcı adı değiştir')));

  // Pencere basligi + mevcut ad etiketi; ad bir girdi kutusunda DEGIL.
  expect(screen.getByText('Şu anki kullanıcı adın')).toBeTruthy();
  expect(screen.getByTestId('profil-yeni-kullanici-adi')).toBeTruthy();
});

/** #378: kullanici adi degisimi mevcut sifre ISTEMEZ. */
test('kullanici adi penceresinde sifre alani yok', async () => {
  await ciz();

  await act(async () => fireEvent.press(screen.getByLabelText('Kullanıcı adı değiştir')));

  expect(screen.queryByTestId('profil-ad-mevcut-sifre')).toBeNull();
});

/**
 * Uygunluk her tusa basista DEGIL, yazma durunca sorulur: aksi halde her harf icin istek gider
 * ve yarim yazilmis adlar icin yaniltici "uygun" cikar.
 */
test('yeni ad yazilinca uygunluk hemen sorulmaz, gecikme sonunda sorulur', async () => {
  await ciz();
  await act(async () => fireEvent.press(screen.getByLabelText('Kullanıcı adı değiştir')));

  await act(async () => fireEvent.changeText(screen.getByTestId('profil-yeni-kullanici-adi'), 'yeni_ad'));

  expect(uygunMuMock).toHaveBeenLastCalledWith(null);
  expect(screen.getByText('Kontrol ediliyor…')).toBeTruthy();

  await waitFor(() => expect(uygunMuMock).toHaveBeenLastCalledWith('yeni_ad'), {
    timeout: UYGUNLUK_GECIKMESI_MS + 2000,
  });
});

test('alinmis ad pencerede bildirilir', async () => {
  uygunMuMock.mockReturnValue({ data: false, isPending: false, isError: false });
  await ciz();
  await act(async () => fireEvent.press(screen.getByLabelText('Kullanıcı adı değiştir')));

  await act(async () => fireEvent.changeText(screen.getByTestId('profil-yeni-kullanici-adi'), 'efe'));

  expect(
    await screen.findByText('Bu kullanıcı adı zaten alınmış.', {}, { timeout: UYGUNLUK_GECIKMESI_MS + 2000 }),
  ).toBeTruthy();
});

test('uygun ad pencerede bildirilir', async () => {
  uygunMuMock.mockReturnValue({ data: true, isPending: false, isError: false });
  await ciz();
  await act(async () => fireEvent.press(screen.getByLabelText('Kullanıcı adı değiştir')));

  await act(async () => fireEvent.changeText(screen.getByTestId('profil-yeni-kullanici-adi'), 'yeni_ad'));

  expect(
    await screen.findByText('Bu kullanıcı adı uygun.', {}, { timeout: UYGUNLUK_GECIKMESI_MS + 2000 }),
  ).toBeTruthy();
});

/** Bozuk bicimli ad icin sunucuya HIC sorulmaz: uc 400 doner, onu "alinmis" diye gostermek yanlis olurdu. */
test('bicimi bozuk ad icin uygunluk sorulmaz', async () => {
  await ciz();
  await act(async () => fireEvent.press(screen.getByLabelText('Kullanıcı adı değiştir')));

  await act(async () => fireEvent.changeText(screen.getByTestId('profil-yeni-kullanici-adi'), 'ab'));

  expect(uygunMuMock).toHaveBeenLastCalledWith(null);
  expect(screen.getByText(/3-50 karakter/)).toBeTruthy();
});

test('pencereden kullanici adi kaydedilir', async () => {
  await ciz();
  await act(async () => fireEvent.press(screen.getByLabelText('Kullanıcı adı değiştir')));

  await act(async () => fireEvent.changeText(screen.getByTestId('profil-yeni-kullanici-adi'), 'yeni_ad'));
  await act(async () => fireEvent.press(within(screen.getByTestId('modal-govde')).getByText('Kaydet')));

  expect(updateProfile).toHaveBeenCalledWith({ yeniKullaniciAdi: 'yeni_ad' });
});

test('sunucu 409 donerse pencerede alinmis yazar', async () => {
  updateProfile.mockRejectedValue(new ApiError(409, "'efe' kullanıcı adı zaten alınmış."));
  await ciz();
  await act(async () => fireEvent.press(screen.getByLabelText('Kullanıcı adı değiştir')));

  await act(async () => fireEvent.changeText(screen.getByTestId('profil-yeni-kullanici-adi'), 'efe'));
  await act(async () => fireEvent.press(within(screen.getByTestId('modal-govde')).getByText('Kaydet')));

  expect(await screen.findByText('Bu kullanıcı adı zaten alınmış.')).toBeTruthy();
});

// ---- Profil fotografi (#510) ----

/**
 * #510 (kullanici bildirdi, gercek iPhone): fotograf kirpilip secilince "kaydedilmiyor". iOS
 * simulatorde akis calisiyor (204, 46 KB JPEG); cihazda neyin patladigi GORULEMIYORDU cunku tum
 * hatalar tek, sabit bir "yuklenemedi" mesajina yutuluyordu. Bu testler hatanin HANGI ADIMDA ve
 * NEDEN oldugunun ekrana yazildigini sabitler.
 */
function galeriSecer() {
  mockGaleri.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///secilen.heic' }] });
}

function kucultmeBasarili() {
  mockKucult.mockResolvedValue({ saveAsync: async () => ({ uri: 'file:///kucuk.jpg' }) });
}

async function fotografSec() {
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Fotoğraf seç' })));
}

beforeEach(() => {
  mockGaleri.mockReset();
  mockKucult.mockReset();
});

test('sunucu fotografi reddederse sunucunun kendi mesaji gorunur', async () => {
  galeriSecer();
  kucultmeBasarili();
  (useFotografiYukle as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockRejectedValue(new ApiError(400, 'Fotoğraf JPEG, PNG ya da WebP olmalı.')),
    isPending: false,
  });
  await ciz();

  await fotografSec();

  expect(screen.getByText('Fotoğraf JPEG, PNG ya da WebP olmalı.')).toBeTruthy();
});

/** Cihazda patlayan yerel bir adim: hangi adim oldugu VE hatanin kendi metni gorunur. */
test('fotograf hazirlanamazsa adim ve hatanin ayrintisi gorunur', async () => {
  galeriSecer();
  mockKucult.mockRejectedValue(new Error('Could not decode image'));
  const yukle = jest.fn();
  (useFotografiYukle as jest.Mock).mockReturnValue({ mutateAsync: yukle, isPending: false });
  await ciz();

  await fotografSec();

  expect(screen.getByText('Fotoğraf hazırlanamadı.')).toBeTruthy();
  expect(screen.getByText(/Could not decode image/)).toBeTruthy();
  // Hazirlanamayan fotograf sunucuya HIC gonderilmez.
  expect(yukle).not.toHaveBeenCalled();
});

/** Sunucuya ulasilamazsa (ag, zaman asimi) bu da kendi adiyla soylenir. */
test('fotograf sunucuya gonderilemezse ayrintisiyla gorunur', async () => {
  galeriSecer();
  kucultmeBasarili();
  (useFotografiYukle as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockRejectedValue(new TypeError('Network request failed')),
    isPending: false,
  });
  await ciz();

  await fotografSec();

  expect(screen.getByText('Fotoğraf sunucuya gönderilemedi.')).toBeTruthy();
  expect(screen.getByText(/Network request failed/)).toBeTruthy();
});

/**
 * Yukleme surerken gorunur bir gosterge (issue: "bir sey olmuyor" hissi). Yalnizca dugmeyi
 * soluklastirmak yetmiyordu.
 */
test('yukleme surerken gosterge gorunur', async () => {
  galeriSecer();
  kucultmeBasarili();
  (useFotografiYukle as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: true });
  await ciz();

  expect(screen.getByTestId('fotograf-yukleniyor')).toBeTruthy();
});

/** Galeri iptal edilirse hicbir sey olmaz: ne hata ne gonderim. */
test('galeri iptal edilirse hata da gonderim de olmaz', async () => {
  mockGaleri.mockResolvedValue({ canceled: true, assets: null });
  const yukle = jest.fn();
  (useFotografiYukle as jest.Mock).mockReturnValue({ mutateAsync: yukle, isPending: false });
  await ciz();

  await fotografSec();

  expect(yukle).not.toHaveBeenCalled();
  expect(screen.queryByRole('alert')).toBeNull();
});
