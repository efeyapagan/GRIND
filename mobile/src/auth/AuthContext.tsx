import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { request, setUnauthorizedHandler } from '@grind/shared/api/client';
import { session } from '../session';
import type { components } from '@grind/shared/api/schema';

type AuthResponse = components['schemas']['AuthResponse'];

interface AuthContextValue {
  username: string | null;
  isAuthenticated: boolean;
  login: (kullaniciAdi: string, sifre: string) => Promise<void>;
  register: (kullaniciAdi: string, sifre: string) => Promise<void>;
  logout: () => void;
  updateProfile: (
    mevcutSifre: string,
    yeniKullaniciAdi?: string,
    yeniSifre?: string,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * web/src/auth/AuthContext.tsx ile ayni sozlesme (issue #65) -- tek fark, `session` burada
 * expo-secure-store tabanli ve write/clear ASENKRON (bkz. ../session.ts).
 */
function dogrulanmisKimlikYaniti(yanit: AuthResponse): {
  token: string;
  expiresAtUtc: string;
  username: string;
} {
  if (!yanit.token || !yanit.expiresAtUtc || !yanit.username) {
    throw new Error('Sunucudan eksik kimlik yanıtı alındı.');
  }
  return { token: yanit.token, expiresAtUtc: yanit.expiresAtUtc, username: yanit.username };
}

async function kimlikIstegiGonder(
  yol: '/auth/login' | '/auth/register',
  kullaniciAdi: string,
  sifre: string,
): Promise<{ token: string; expiresAtUtc: string; username: string }> {
  const yanit = await request<AuthResponse>(yol, {
    method: 'POST',
    body: JSON.stringify({ username: kullaniciAdi, password: sifre }),
    auth: false,
  });
  return dogrulanmisKimlikYaniti(yanit);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState<string | null>(() => {
    const oturum = session.read();
    return session.isValid() && oturum ? oturum.username : null;
  });

  const logout = useCallback(() => {
    void session.clear();
    setUsername(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(() => {});
  }, [logout]);

  const login = useCallback(async (kullaniciAdi: string, sifre: string) => {
    const dogrulanmis = await kimlikIstegiGonder('/auth/login', kullaniciAdi, sifre);
    await session.write(dogrulanmis.token, dogrulanmis.expiresAtUtc, dogrulanmis.username);
    setUsername(dogrulanmis.username);
  }, []);

  const register = useCallback(async (kullaniciAdi: string, sifre: string) => {
    const dogrulanmis = await kimlikIstegiGonder('/auth/register', kullaniciAdi, sifre);
    await session.write(dogrulanmis.token, dogrulanmis.expiresAtUtc, dogrulanmis.username);
    setUsername(dogrulanmis.username);
  }, []);

  const updateProfile = useCallback(
    async (mevcutSifre: string, yeniKullaniciAdi?: string, yeniSifre?: string) => {
      const govde: Record<string, string> = { currentPassword: mevcutSifre };
      if (yeniKullaniciAdi !== undefined) {
        govde.newUsername = yeniKullaniciAdi;
      }
      if (yeniSifre !== undefined) {
        govde.newPassword = yeniSifre;
      }

      const yanit = await request<AuthResponse>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(govde),
        sifreTeyidi401: true,
      });
      const dogrulanmis = dogrulanmisKimlikYaniti(yanit);
      await session.write(dogrulanmis.token, dogrulanmis.expiresAtUtc, dogrulanmis.username);
      setUsername(dogrulanmis.username);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ username, isAuthenticated: username !== null, login, register, logout, updateProfile }),
    [username, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  }
  return context;
}
