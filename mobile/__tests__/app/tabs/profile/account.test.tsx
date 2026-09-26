import { render, screen } from '@testing-library/react-native';
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

beforeEach(() => {
  (useAuth as jest.Mock).mockReturnValue({ username: 'ada', updateProfile: jest.fn(), logout: jest.fn() });
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
test('kullanici adi ve sifre formlari burada degil', async () => {
  await ekraniOlustur();

  expect(screen.queryByTestId('profil-yeni-kullanici-adi')).toBeNull();
  expect(screen.queryByTestId('profil-yeni-sifre')).toBeNull();
  expect(screen.queryByText('Şifre değiştir')).toBeNull();
});

test('hesabin ayarlari yerinde kalir', async () => {
  await ekraniOlustur();

  expect(screen.getByText('Antrenman hedefi')).toBeTruthy();
  expect(screen.getByText('Tema')).toBeTruthy();
  expect(screen.getByText('Çıkış yap')).toBeTruthy();
});
