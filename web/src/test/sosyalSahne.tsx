import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { server } from './msw';
import { AuthProvider } from '../auth/AuthContext';
import { session } from '../auth/session';
import { PageTitleProvider } from '../ui/PageTitleContext';
import ProfileLayout from '../pages/ProfileLayout';
import KullaniciProfiliPage from '../pages/KullaniciProfiliPage';
import ArkadasGecmisiPage from '../pages/ArkadasGecmisiPage';
import ArkadasRekorlariPage from '../pages/ArkadasRekorlariPage';
import TakipListesiPage from '../pages/TakipListesiPage';
import KullaniciAraPage from '../pages/KullaniciAraPage';

/**
 * #284 testlerinin ortak sahnesi: `routes.tsx`'teki sosyal rotaların aynısı, kendi profilin yer
 * tutucularla. Oturum açmış kullanıcı `efeypgn`.
 */
export function sosyalSahneyiOlustur(yol: string) {
  session.write('gecerli-token', new Date(Date.now() + 3_600_000).toISOString(), 'efeypgn');
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}
    >
      <AuthProvider>
        <PageTitleProvider>
          <MemoryRouter initialEntries={[yol]}>
            <Routes>
              <Route path="/profile" element={<ProfileLayout />}>
                <Route index element={<Navigate to="history" replace />} />
                <Route path="history" element={<p>Kendi geçmişim</p>} />
              </Route>
              <Route path="/search" element={<KullaniciAraPage />} />
              <Route path="/u/:username" element={<KullaniciProfiliPage />}>
                <Route index element={<Navigate to="history" replace />} />
                <Route path="history" element={<ArkadasGecmisiPage />} />
                <Route path="records" element={<ArkadasRekorlariPage />} />
              </Route>
              <Route path="/u/:username/friends" element={<TakipListesiPage liste="friends" />} />
              <Route path="/u/:username/followers" element={<TakipListesiPage liste="followers" />} />
              <Route path="/u/:username/following" element={<TakipListesiPage liste="following" />} />
            </Routes>
          </MemoryRouter>
        </PageTitleProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

type Iliski = 'Self' | 'None' | 'Following' | 'FollowedBy' | 'Friends';

export function kullaniciProfili(
  username: string,
  relation: Iliski,
  ek: Partial<{ displayName: string | null; age: number | null; followerCount: number }> = {},
) {
  return {
    username,
    displayName: null,
    age: null,
    hasAvatar: false,
    avatarVersion: null,
    friendCount: 1,
    followerCount: 2,
    followingCount: 3,
    relation,
    ...ek,
  };
}

export function kullaniciSatiri(username: string, relation: Iliski, displayName: string | null = null) {
  return { username, displayName, hasAvatar: false, avatarVersion: null, relation };
}

export function sayfa<T>(items: T[]) {
  return { items, page: 1, pageSize: 25, totalCount: items.length, totalPages: 1 };
}

/** Kendi profil başlığının uçları (#283) — `/profile`'a dönen testler için. */
export function kendiProfilimiKur() {
  server.use(
    http.get('/api/profile', () =>
      HttpResponse.json({
        username: 'efeypgn',
        displayName: 'Efe Yapağan',
        birthDate: null,
        age: null,
        hasAvatar: false,
        avatarVersion: null,
      }),
    ),
    http.get('/api/users/efeypgn/profile', () => HttpResponse.json(kullaniciProfili('efeypgn', 'Self'))),
  );
}
