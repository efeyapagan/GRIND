import { render, screen, waitFor } from '@testing-library/react-native';
import { fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { request } from '@grind/shared/api/client';
import { AuthProvider, useAuth } from './AuthContext';
import { session } from '../session';

jest.mock('@grind/shared/api/client', () => ({
  request: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));

const requestMock = request as jest.Mock;

function Ekran() {
  const { username, isAuthenticated, login, register, logout } = useAuth();
  return (
    <>
      <Text>{isAuthenticated ? `giris yapildi: ${username}` : 'giris yapilmadi'}</Text>
      <Pressable onPress={() => login('efe', 'sifre123').catch(() => undefined)}>
        <Text>giris</Text>
      </Pressable>
      <Pressable onPress={() => register('efe', 'sifre123').catch(() => undefined)}>
        <Text>kayit</Text>
      </Pressable>
      <Pressable onPress={logout}>
        <Text>cikis</Text>
      </Pressable>
    </>
  );
}

function ekraniOlustur() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Ekran />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  requestMock.mockReset();
  await session.clear();
});

test('basariyla giris yapinca oturum acilir ve session a yazilir', async () => {
  requestMock.mockResolvedValue({ token: 'tok-1', expiresAtUtc: new Date(Date.now() + 60_000).toISOString(), username: 'efe' });
  await ekraniOlustur();

  await fireEvent.press(screen.getByText('giris'));

  await waitFor(() => expect(screen.getByText('giris yapildi: efe')).toBeTruthy());
  expect(session.read()).toMatchObject({ token: 'tok-1', username: 'efe' });
});

test('basariyla kayit olunca oturum acilir', async () => {
  requestMock.mockResolvedValue({ token: 'tok-2', expiresAtUtc: new Date(Date.now() + 60_000).toISOString(), username: 'efe' });
  await ekraniOlustur();

  await fireEvent.press(screen.getByText('kayit'));

  await waitFor(() => expect(screen.getByText('giris yapildi: efe')).toBeTruthy());
});

test('cikis oturumu kapatir ve session i temizler', async () => {
  requestMock.mockResolvedValue({ token: 'tok-3', expiresAtUtc: new Date(Date.now() + 60_000).toISOString(), username: 'efe' });
  await ekraniOlustur();
  await fireEvent.press(screen.getByText('giris'));
  await waitFor(() => expect(screen.getByText('giris yapildi: efe')).toBeTruthy());

  await fireEvent.press(screen.getByText('cikis'));

  await waitFor(() => expect(screen.getByText('giris yapilmadi')).toBeTruthy());
  expect(session.read()).toBeNull();
});

test('giris basarisiz olursa oturum acilmaz', async () => {
  requestMock.mockRejectedValue(new Error('401'));
  await ekraniOlustur();

  await fireEvent.press(screen.getByText('giris'));

  await waitFor(() => expect(requestMock).toHaveBeenCalled());
  expect(screen.getByText('giris yapilmadi')).toBeTruthy();
});
