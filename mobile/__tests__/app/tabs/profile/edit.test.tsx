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

// #510: fotograf akisinin yerel adimlari -- galeri, hazirlama/kirpma (manipulator), dosya. Testte ne
// dondurecekleri (ya da hangi adimda patlayacaklari) her testte ayrica belirlenir.
const mockGaleri = jest.fn();
const mockKucult = jest.fn();
const mockKes = jest.fn();
const mockBoyutlandir = jest.fn();
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: (secenek: unknown) => mockGaleri(secenek) }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => {
      const baglam = {
        resize: (boyut: unknown) => {
          mockBoyutlandir(boyut);
          return baglam;
        },
        crop: (alan: unknown) => {
          mockKes(alan);
          return baglam;
        },
        renderAsync: () => mockKucult(),
      };
      return baglam;
    },
  },
}));
// #565: fotograf alani hata siniri testinde bilerek patlatilir.
const mockFotografPatlasin = { deger: false };
jest.mock('../../../../src/components/ProfilFotografi', () => {
  const gercek = jest.requireActual('../../../../src/components/ProfilFotografi');
  return {
    __esModule: true,
    default: (props: object) => {
      if (mockFotografPatlasin.deger) {
        throw new Error('Beklenmedik hata');
      }
      return gercek.default(props);
    },
  };
});
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
function galeriSecer(genislik = 4000, yukseklik = 3000) {
  mockGaleri.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///secilen.heic', width: genislik, height: yukseklik }] });
}

/** Manipulator her render'da bir gorsel doner: once hazirlanan (2048 uzun kenar), sonra kirpilan kucuk JPEG. */
function kucultmeBasarili() {
  mockKucult.mockResolvedValue({
    width: 2048,
    height: 1536,
    saveAsync: async () => ({ uri: 'file:///kucuk.jpg', width: 2048, height: 1536 }),
  });
}

/** Galeriyi acar ve (acilirsa) kirpma ekraninda Kullan'a basar. */
async function fotografSec() {
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Fotoğraf seç' })));
  const kullan = screen.queryByRole('button', { name: 'Kullan' });
  if (kullan) {
    await act(async () => fireEvent.press(kullan));
  }
}

beforeEach(() => {
  mockGaleri.mockReset();
  mockKucult.mockReset();
  mockKes.mockReset();
  mockBoyutlandir.mockReset();
  mockFotografPatlasin.deger = false;
});

// ---- #565: kirpmayi kullanici kendi secer, iOS'un yerlesik kirpma ekrani kullanilmaz ----

/**
 * #565: `allowsEditing` iOS'ta eski `UIImagePickerController`i aciyordu (buyuk galeride ~5 sn, iCloud'daki
 * fotografta kirpma ekrani tutarsiz, 48 MP'de bellek). Secici kirpmasiz acilir, kirpma uygulamada yapilir.
 */
test('galeri yerlesik kirpma olmadan acilir', async () => {
  mockGaleri.mockResolvedValue({ canceled: true, assets: null });
  await ciz();

  await fotografSec();

  expect(mockGaleri).toHaveBeenCalledTimes(1);
  expect(mockGaleri.mock.calls[0][0]).not.toHaveProperty('allowsEditing', true);
});

test('secilen fotograf once uzun kenari 2048e kucultulup kirpma ekraninda acilir', async () => {
  galeriSecer(4000, 3000);
  kucultmeBasarili();
  await ciz();

  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Fotoğraf seç' })));

  expect(mockBoyutlandir).toHaveBeenCalledWith({ width: 2048 });
  expect(screen.getByText('Fotoğrafı kırp')).toBeTruthy();
});

test('Kullan deyince secilen alan kirpilip 256 px kareye kucultulur ve yuklenir', async () => {
  galeriSecer(4000, 3000);
  kucultmeBasarili();
  const yukle = jest.fn();
  (useFotografiYukle as jest.Mock).mockReturnValue({ mutateAsync: yukle, isPending: false });
  await ciz();

  await fotografSec();

  // Hazirlanan 2048 x 1536 gorselin ortasindaki kare.
  expect(mockKes).toHaveBeenCalledWith({ originX: 256, originY: 0, width: 1536, height: 1536 });
  expect(mockBoyutlandir).toHaveBeenLastCalledWith({ width: 256, height: 256 });
  expect(yukle).toHaveBeenCalledTimes(1);
});

test('kirpma ekraninda vazgecilirse yukleme yapilmaz', async () => {
  galeriSecer();
  kucultmeBasarili();
  const yukle = jest.fn();
  (useFotografiYukle as jest.Mock).mockReturnValue({ mutateAsync: yukle, isPending: false });
  await ciz();

  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Fotoğraf seç' })));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Vazgeç' })));

  expect(screen.queryByText('Fotoğrafı kırp')).toBeNull();
  expect(yukle).not.toHaveBeenCalled();
});

/** Fotograf alaninda beklenmedik bir hata ekrani kapatmaz: hata mesaji gorunur, formun geri kalani calisir. */
test('fotograf alani patlarsa ekran kapanmaz, hata mesaji gorunur', async () => {
  mockFotografPatlasin.deger = true;
  const konsol = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  await ciz();

  expect(screen.getByText('Fotoğraf alanında beklenmedik bir hata oldu.')).toBeTruthy();
  expect(screen.getByTestId('profil-gorunen-isim')).toBeTruthy();
  konsol.mockRestore();
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
