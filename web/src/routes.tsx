import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import { ProtectedRoute } from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AnaSayfaPage from './pages/AnaSayfaPage';
import AntrenmanPage from './pages/AntrenmanPage';
import AntrenmanBitirPage from './pages/AntrenmanBitirPage';
import GunDetayPage from './pages/GunDetayPage';
import HistoryPage from './pages/HistoryPage';
import RecordsPage from './pages/RecordsPage';
import SablonlarPage from './pages/SablonlarPage';
import SablonDuzenlePage from './pages/SablonDuzenlePage';
import ProfileLayout from './pages/ProfileLayout';
import ProfilePage from './pages/ProfilePage';
import ProfiliDuzenlePage from './pages/ProfiliDuzenlePage';
import MeasurementsPage from './pages/MeasurementsPage';
import InsightsPage from './pages/InsightsPage';
import KullaniciProfiliPage from './pages/KullaniciProfiliPage';
import ArkadasGecmisiPage from './pages/ArkadasGecmisiPage';
import ArkadasRekorlariPage from './pages/ArkadasRekorlariPage';
import TakipListesiPage from './pages/TakipListesiPage';
import KullaniciAraPage from './pages/KullaniciAraPage';

/**
 * `/`, `/antrenman`, `/profile/*` ve şablon rotaları TEK bir `ProtectedRoute` altında (DRY) --
 * ayrı ayrı sarmak yerine ortak kök route'u bir kere korumalı kılmak, aynı kontrolü tekrarlamaz.
 *
 * Issue #119/#120: alt menü artık Ana Sayfa · (+) · Profil (bkz. App.tsx). Geçmiş ve Rekorlar alt
 * menüden Profil'in sekmelerine taşındı (`ProfileLayout`); eski `/history` ve `/records` rotaları
 * KIRILMASIN diye Profil'in ilgili sekmesine yönlendirilir. Antrenman başlatma/devam etme eski
 * "Bugün" ekranından ayrıldı, kendi rotası (`/antrenman`) oldu.
 *
 * #283: varsayılan sekme Geçmiş. Hesap artık sekme değil: `/profile/account` (Hesap ayarları) ve
 * `/profile/edit` profil başlığındaki düğmelerin açtığı, başlıksız ve sekmesiz ayrı ekranlardır --
 * adres aynı kaldığı için eski `/profile/account` bağlantıları kırılmaz.
 *
 * #284: başkasının profili `/u/:username` (arkadaşsa Geçmiş · Rekorlar alt sekmeleri), takip listeleri
 * `/u/:username/friends|followers|following`, kullanıcı arama `/search`. Kendi listelerin de aynı
 * `/u/<ben>/...` adresindedir; `/u/<ben>` ise `/profile`'a yönlenir.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AnaSayfaPage /> },
      { path: 'antrenman', element: <AntrenmanPage /> },
      { path: 'antrenman/bitir', element: <AntrenmanBitirPage /> },
      { path: 'templates', element: <SablonlarPage /> },
      { path: 'templates/new', element: <SablonDuzenlePage /> },
      { path: 'templates/:id', element: <SablonDuzenlePage /> },
      { path: 'insights', element: <InsightsPage /> },
      // #261/#315: takvimde bir gune dokununca acilan gun detayi ("YYYY-MM-DD").
      { path: 'gun/:gun', element: <GunDetayPage /> },
      {
        path: 'profile',
        element: <ProfileLayout />,
        children: [
          { index: true, element: <Navigate to="history" replace /> },
          { path: 'measurements', element: <MeasurementsPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'records', element: <RecordsPage /> },
        ],
      },
      { path: 'profile/account', element: <ProfilePage /> },
      { path: 'profile/edit', element: <ProfiliDuzenlePage /> },
      { path: 'history', element: <Navigate to="/profile/history" replace /> },
      { path: 'records', element: <Navigate to="/profile/records" replace /> },
      { path: 'search', element: <KullaniciAraPage /> },
      {
        path: 'u/:username',
        element: <KullaniciProfiliPage />,
        children: [
          { index: true, element: <Navigate to="history" replace /> },
          { path: 'history', element: <ArkadasGecmisiPage /> },
          { path: 'records', element: <ArkadasRekorlariPage /> },
        ],
      },
      { path: 'u/:username/friends', element: <TakipListesiPage liste="friends" /> },
      { path: 'u/:username/followers', element: <TakipListesiPage liste="followers" /> },
      { path: 'u/:username/following', element: <TakipListesiPage liste="following" /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
]);
