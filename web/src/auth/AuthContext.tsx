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
import { request, setUnauthorizedHandler } from '../api/client';
import { session } from './session';
import type { components } from '../api/schema';

type AuthResponse = components['schemas']['AuthResponse'];

interface AuthContextValue {
  username: string | null;
  isAuthenticated: boolean;
  login: (kullaniciAdi: string, sifre: string) => Promise<void>;
  register: (kullaniciAdi: string, sifre: string) => Promise<void>;
  logout: () => void;
  /**
   * Profilde kullanici adi ve/veya sifre degistirir (issue #65). `mevcutSifre` HER ZAMAN
   * gonderilir (backend'in guvenlik kurali); `yeniKullaniciAdi`/`yeniSifre` opsiyoneldir ama
   * en az biri dolu olmali -- bu kontrol cagiran formda yapilir, burada tekrarlanmaz.
   * Basarili olursa oturum YENI token/kullanici adiyla GUNCELLENIR, cikis yapilmaz.
   */
  updateProfile: (
    mevcutSifre: string,
    yeniKullaniciAdi?: string,
    yeniSifre?: string,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * schema.d.ts'te AuthResponse'un her alanı optional (Swashbuckle bunları required
 * işaretlemedi), ama sunucu ikisini de her zaman doldurur. Doğrulamayı burada TEK bir yerde
 * yapıp temiz bir hata fırlatıyoruz -- her çağrı yerinde "!" ile susturmak yerine, sunucudan
 * gerçekten eksik bir yanıt gelirse bunu sessizce yutmadan haber veriyoruz.
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
    session.clear();
    setUsername(null);
    // Bir sonraki hesap ayni QueryClient'i paylasir (main.tsx'te modul-seviyesinde TEK bir
    // instance) -- temizlenmezse B girisinde, ayni sorgu anahtarlariyla (orn. `records`,
    // `sessionSets`) A'nin onbellekteki verisi B'nin ekraninda ANINDA (arka plandaki yeniden
    // getirme donene kadar) gorunur (review bulgusu I1). Bu ayni zamanda 401 yolunu da kapsar --
    // asagidaki `setUnauthorizedHandler` de bu `logout`u cagirir.
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    // 401 gelen HER istek oturumu düşürür -- token süresi doldu ya da hesap pasifleştirildi
    // (Faz 13), istemci ikisini ayırt etmez, ikisinin de cevabı aynı: login'e dön.
    setUnauthorizedHandler(logout);

    // client.ts'teki isleyici modul-seviyesinde TEK bir singleton -- bu Provider unmount
    // olursa (orn. test ortaminda yeni bir render agaci kurulurken) eski/olu closure'i kayitli
    // birakmamak icin no-op'a resetliyoruz. Aksi halde unmount sonrasi gelen gecikmis bir 401,
    // artik var olmayan bir bilesenin state'ini guncellemeye calisirdi.
    return () => setUnauthorizedHandler(() => {});
  }, [logout]);

  const login = useCallback(async (kullaniciAdi: string, sifre: string) => {
    const dogrulanmis = await kimlikIstegiGonder('/auth/login', kullaniciAdi, sifre);
    session.write(dogrulanmis.token, dogrulanmis.expiresAtUtc, dogrulanmis.username);
    setUsername(dogrulanmis.username);
  }, []);

  const register = useCallback(async (kullaniciAdi: string, sifre: string) => {
    const dogrulanmis = await kimlikIstegiGonder('/auth/register', kullaniciAdi, sifre);
    session.write(dogrulanmis.token, dogrulanmis.expiresAtUtc, dogrulanmis.username);
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

      // `sifreTeyidi401`: burada 401, "mevcut sifreni yanlis yazdin" demektir -- oturumun
      // GECERSIZ oldugu anlamina gelmez, kullaniciyi giris ekranina firlatmamali (client.ts).
      const yanit = await request<AuthResponse>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(govde),
        sifreTeyidi401: true,
      });
      const dogrulanmis = dogrulanmisKimlikYaniti(yanit);
      session.write(dogrulanmis.token, dogrulanmis.expiresAtUtc, dogrulanmis.username);
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
