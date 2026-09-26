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
