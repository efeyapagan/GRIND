import { act, render, screen, fireEvent, within } from '@testing-library/react-native';
import { ApiError } from '@grind/shared/api/problem';
import { PageTitleProvider } from '@grind/shared/pageTitle';
import { useAuth } from '../../../../src/auth/AuthContext';
import { TemaProvider } from '../../../../src/ui/TemaContext';
import AccountScreen from '../../../../app/(tabs)/profile/account';

jest.mock('../../../../src/auth/AuthContext', () => ({ useAuth: jest.fn() }));

// Ekranin kartlari (haftalik hedef, gizlilik) sunucudan okur; bu testin konusu degiller.
jest.mock('@grind/shared/api/queries', () => ({
  useGuncelTakvimOzeti: () => ({ data: undefined, isError: false }),
  useProfilim: () => ({ data: undefined, isError: false }),
  useSetPrivacyLevel: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const updateProfile = jest.fn();

beforeEach(() => {
  updateProfile.mockReset().mockResolvedValue(undefined);
  (useAuth as jest.Mock).mockReturnValue({ username: 'ada', updateProfile, logout: jest.fn() });
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

/**
 * #372: kimlik bilgileri (kullanici adi, sifre) "Profili duzenle"ye tasindi -- kullanici kendini
 * duzenlemeye kalem ikonundan giriyor ve hepsini orada bulmali. Formlarin buraya geri sizmasi
 * bu testle engellenir; davranislarinin kendisi edit.test.tsx'te.
 */
test('kullanici adi formu burada degil', async () => {
  await ekraniOlustur();

  expect(screen.queryByTestId('profil-yeni-kullanici-adi')).toBeNull();
});

/** #378: sifre degistirme buraya, cikisin USTUNE tasindi (kullanici karari). */
test('sifre degistir tusu cikisin ustunde ve pencereyi acar', async () => {
  await ekraniOlustur();

  expect(screen.getByText('Şifre değiştir')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText('Şifre değiştir')));

  expect(screen.getByTestId('profil-yeni-sifre')).toBeTruthy();
  expect(screen.getByTestId('profil-yeni-sifre-tekrar')).toBeTruthy();
});

test('sifre penceresinde yanlis mevcut sifre bildirilir', async () => {
  updateProfile.mockRejectedValue(new ApiError(401, 'Kullanıcı adı veya şifre hatalı.'));
  await ekraniOlustur();
  await act(async () => fireEvent.press(screen.getByText('Şifre değiştir')));

  await act(async () => fireEvent.changeText(screen.getByTestId('profil-mevcut-sifre'), 'yanlis'));
  await act(async () => fireEvent.changeText(screen.getByTestId('profil-yeni-sifre'), 'yeni-sifre-123'));
  await act(async () => fireEvent.changeText(screen.getByTestId('profil-yeni-sifre-tekrar'), 'yeni-sifre-123'));
  await act(async () => fireEvent.press(within(screen.getByTestId('modal-govde')).getByText('Kaydet')));

  expect(await screen.findByText('Mevcut şifre yanlış.')).toBeTruthy();
});

test('sifre degisimi mevcut sifreyle birlikte gonderilir', async () => {
  await ekraniOlustur();
  await act(async () => fireEvent.press(screen.getByText('Şifre değiştir')));

  await act(async () => fireEvent.changeText(screen.getByTestId('profil-mevcut-sifre'), 'dogru'));
  await act(async () => fireEvent.changeText(screen.getByTestId('profil-yeni-sifre'), 'yeni-sifre-123'));
  await act(async () => fireEvent.changeText(screen.getByTestId('profil-yeni-sifre-tekrar'), 'yeni-sifre-123'));
  await act(async () => fireEvent.press(within(screen.getByTestId('modal-govde')).getByText('Kaydet')));

  expect(updateProfile).toHaveBeenCalledWith({ mevcutSifre: 'dogru', yeniSifre: 'yeni-sifre-123' });
});

test('hesabin ayarlari yerinde kalir', async () => {
  await ekraniOlustur();

  expect(screen.getByText('Antrenman hedefi')).toBeTruthy();
  expect(screen.getByText('Tema')).toBeTruthy();
  expect(screen.getByText('Çıkış yap')).toBeTruthy();
});
