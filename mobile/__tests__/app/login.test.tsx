import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import { AuthProvider } from '../../src/auth/AuthContext';
import { session } from '../../src/session';
import LoginScreen from '../../app/login';

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
        <LoginScreen />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  requestMock.mockReset();
  mockReplace.mockReset();
  await session.clear();
});

test('bos formu gondermeye calisinca alan hatalari gorunur, istek atilmaz', async () => {
  await ekraniOlustur();

  await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));

  expect(await screen.findByText('Kullanıcı adı gerekli.')).toBeTruthy();
  expect(screen.getByText('Şifre gerekli.')).toBeTruthy();
  expect(requestMock).not.toHaveBeenCalled();
});

test('basarili girişte / e yonlendirir', async () => {
  requestMock.mockResolvedValue({
    token: 'tok',
    expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
    username: 'efe',
  });
  await ekraniOlustur();

  await fireEvent.changeText(screen.getByLabelText('Kullanıcı adı'), 'efe');
  await fireEvent.changeText(screen.getByLabelText('Şifre'), 'sifre123');
  await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
});

test('401 gelince notr hata mesaji gosterilir, alanlar temizlenmez', async () => {
  const { ApiError } = jest.requireActual('@grind/shared/api/problem');
  requestMock.mockRejectedValue(new ApiError(401, 'Yetkisiz'));
  await ekraniOlustur();

  await fireEvent.changeText(screen.getByLabelText('Kullanıcı adı'), 'efe');
  await fireEvent.changeText(screen.getByLabelText('Şifre'), 'yanlis-sifre');
  await fireEvent.press(screen.getByRole('button', { name: 'Giriş yap' }));

  expect(await screen.findByText('Kullanıcı adı veya şifre hatalı.')).toBeTruthy();
  expect(screen.getByDisplayValue('efe')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});
