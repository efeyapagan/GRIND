import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import { ApiError } from '@grind/shared/api/problem';
import { useAuth } from '../../../../src/auth/AuthContext';
import { TemaProvider } from '../../../../src/ui/TemaContext';
import AccountScreen from '../../../../app/(tabs)/profile/account';

jest.mock('../../../../src/auth/AuthContext', () => ({ useAuth: jest.fn() }));

// Ekranin diger kartlari (haftalik hedef, gizlilik) sunucudan okur; bu testin konusu degiller.
jest.mock('@grind/shared/api/queries', () => ({
  useGuncelTakvimOzeti: () => ({ data: undefined, isError: false }),
  useProfilim: () => ({ data: undefined, isError: false }),
  useSetPrivacyLevel: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const updateProfile = jest.fn();

beforeEach(() => {
  updateProfile.mockReset();
  updateProfile.mockResolvedValue(undefined);
  (useAuth as jest.Mock).mockReturnValue({
    username: 'ada',
    updateProfile,
    logout: jest.fn(),
  });
});

async function ekraniOlustur() {
  return render(
    <PageTitleProvider>
      <TemaProvider>
        <AccountScreen />
      </TemaProvider>
    </PageTitleProvider>,
  );
}

async function adiDegistir(yeniAd: string, sifre = 'dogru-sifre') {
  // Her olay AYRI bir act icinde: ucu birden tek blokta calistirilirsa React araya yeniden
  // cizim sokmaz ve "Kaydet"e basildiginda handler hala ILK cizimin (bos) durumunu okur.
  await act(async () => fireEvent.changeText(screen.getByTestId('profil-yeni-kullanici-adi'), yeniAd));
  await act(async () => fireEvent.changeText(screen.getByTestId('profil-ad-mevcut-sifre'), sifre));
  await act(async () => fireEvent.press(screen.getByText('Kullanıcı adını kaydet')));
}

/** #342: kullanici adi degistirilebilsin. Uc (#65) mevcut sifreyi TEYIT ister. */
test('gecerli yeni ad ve sifreyle kullanici adi guncellenir', async () => {
  await ekraniOlustur();

  await adiDegistir('ada_kilinc');

  await waitFor(() => expect(updateProfile).toHaveBeenCalledWith('dogru-sifre', 'ada_kilinc'));
  expect(await screen.findByText('Kullanıcı adın güncellendi.')).toBeTruthy();
});

/**
 * Kural ihlali sunucuya HIC gitmez: backend'in regex'i (3-50, harf/rakam/_/-) istemcide de
 * uygulanir, yoksa kullanici sifresini bos yere yazip 400 yer.
 */
test.each([
  ['ab', 'cok kisa'],
  ['ada kılınç', 'bosluk ve Turkce harf'],
])('kurallara uymayan ad (%s) istek gondermez', async (yeniAd) => {
  await ekraniOlustur();

  await adiDegistir(yeniAd);

  expect(
    await screen.findByText(
      'Kullanıcı adı 3-50 karakter olmalı; yalnızca İngilizce harf, rakam, _ ve - içerebilir.',
    ),
  ).toBeTruthy();
  expect(updateProfile).not.toHaveBeenCalled();
});

/** Issue'nun asil istedigi: cakisma kontrolu. Sunucu 409 doner, kullanici alanin altinda gorur. */
test('alinmis kullanici adi alan hatasi gosterir', async () => {
  updateProfile.mockRejectedValue(
    new ApiError(409, "'efe' kullanıcı adı zaten alınmış."),
  );
  await ekraniOlustur();

  await adiDegistir('efe');

  expect(await screen.findByText('Bu kullanıcı adı zaten alınmış.')).toBeTruthy();
});

test('yanlis mevcut sifre mesaji gosterilir', async () => {
  updateProfile.mockRejectedValue(new ApiError(401, 'Kullanıcı adı veya şifre hatalı.'));
  await ekraniOlustur();

  await adiDegistir('ada_kilinc', 'yanlis-sifre');

  expect(await screen.findByText('Mevcut şifre yanlış.')).toBeTruthy();
});

/** Degismeyen ad icin sifre sorup 200 donmek anlamsiz: istek hic gitmez. */
test('ad degismemisse istek gitmez', async () => {
  await ekraniOlustur();

  await adiDegistir('ada');

  expect(await screen.findByText('Yeni bir kullanıcı adı gir.')).toBeTruthy();
  expect(updateProfile).not.toHaveBeenCalled();
});
