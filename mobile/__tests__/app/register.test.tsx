import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import { AuthProvider } from '../../src/auth/AuthContext';
import { session } from '../../src/session';
import RegisterScreen from '../../app/register';

jest.mock('@grind/shared/api/client', () => ({
  request: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const requestMock = request as jest.Mock;

function ekraniOlustur() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  requestMock.mockReset();
  mockReplace.mockReset();
  await session.clear();
});

test('gecersiz kullanici adi deseni reddedilir', async () => {
  await ekraniOlustur();

  await fireEvent.changeText(screen.getByLabelText('Kullanıcı adı'), 'a b');
  await fireEvent.changeText(screen.getByLabelText('Şifre'), 'yeterince-uzun-123');
  await fireEvent.changeText(screen.getByLabelText('Şifre tekrarı'), 'yeterince-uzun-123');
  await fireEvent.press(screen.getByRole('button', { name: 'Kayıt ol' }));

  expect(
    await screen.findByText('Kullanıcı adı 3-50 karakter olmalı; yalnızca İngilizce harf, rakam, _ ve - içerebilir.'),
  ).toBeTruthy();
  expect(requestMock).not.toHaveBeenCalled();
});

test('kisa sifre reddedilir', async () => {
  await ekraniOlustur();

  await fireEvent.changeText(screen.getByLabelText('Kullanıcı adı'), 'gecerli_ad');
  await fireEvent.changeText(screen.getByLabelText('Şifre'), 'kisa');
  await fireEvent.changeText(screen.getByLabelText('Şifre tekrarı'), 'kisa');
  await fireEvent.press(screen.getByRole('button', { name: 'Kayıt ol' }));

  expect(await screen.findByText('Şifre en az 8 karakter olmalı.')).toBeTruthy();
});

test('sifreler eslesmiyorsa hata gosterilir', async () => {
  await ekraniOlustur();

  await fireEvent.changeText(screen.getByLabelText('Kullanıcı adı'), 'gecerli_ad');
  await fireEvent.changeText(screen.getByLabelText('Şifre'), 'yeterince-uzun-123');
  await fireEvent.changeText(screen.getByLabelText('Şifre tekrarı'), 'baska-bir-sifre');
  await fireEvent.press(screen.getByRole('button', { name: 'Kayıt ol' }));

  expect(await screen.findByText('Şifreler eşleşmiyor.')).toBeTruthy();
  expect(requestMock).not.toHaveBeenCalled();
});

test('basarili kayitta / e yonlendirir', async () => {
  requestMock.mockResolvedValue({
    token: 'tok',
    expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
    username: 'gecerli_ad',
  });
  await ekraniOlustur();

  await fireEvent.changeText(screen.getByLabelText('Kullanıcı adı'), 'gecerli_ad');
  await fireEvent.changeText(screen.getByLabelText('Şifre'), 'yeterince-uzun-123');
  await fireEvent.changeText(screen.getByLabelText('Şifre tekrarı'), 'yeterince-uzun-123');
  await fireEvent.press(screen.getByRole('button', { name: 'Kayıt ol' }));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
});

test('sunucu 409 donerse kullanici adi alaninin altinda gosterilir', async () => {
  const { ApiError } = jest.requireActual('@grind/shared/api/problem');
  requestMock.mockRejectedValue(new ApiError(409, "'gecerli_ad' kullanıcı adı zaten alınmış.", { username: ["'gecerli_ad' kullanıcı adı zaten alınmış."] }));
  await ekraniOlustur();

  await fireEvent.changeText(screen.getByLabelText('Kullanıcı adı'), 'gecerli_ad');
  await fireEvent.changeText(screen.getByLabelText('Şifre'), 'yeterince-uzun-123');
  await fireEvent.changeText(screen.getByLabelText('Şifre tekrarı'), 'yeterince-uzun-123');
  await fireEvent.press(screen.getByRole('button', { name: 'Kayıt ol' }));

  expect(await screen.findByText("'gecerli_ad' kullanıcı adı zaten alınmış.")).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});
