import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import { ProtectedRoute } from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AnaSayfaPage from './pages/AnaSayfaPage';
import AntrenmanPage from './pages/AntrenmanPage';
import AntrenmanBitirPage from './pages/AntrenmanBitirPage';
import HistoryPage from './pages/HistoryPage';
import RecordsPage from './pages/RecordsPage';
import SablonlarPage from './pages/SablonlarPage';
import SablonDuzenlePage from './pages/SablonDuzenlePage';
import ProfileLayout from './pages/ProfileLayout';
import ProfilePage from './pages/ProfilePage';
import MeasurementsPage from './pages/MeasurementsPage';
import InsightsPage from './pages/InsightsPage';

/**
 * `/`, `/antrenman`, `/profile/*` ve şablon rotaları TEK bir `ProtectedRoute` altında (DRY) --
 * ayrı ayrı sarmak yerine ortak kök route'u bir kere korumalı kılmak, aynı kontrolü tekrarlamaz.
 *
 * Issue #119/#120: alt menü artık Ana Sayfa · (+) · Profil (bkz. App.tsx). Geçmiş ve Rekorlar alt
 * menüden Profil'in sekmelerine taşındı (`ProfileLayout`); eski `/history` ve `/records` rotaları
 * KIRILMASIN diye Profil'in ilgili sekmesine yönlendirilir. Antrenman başlatma/devam etme eski
 * "Bugün" ekranından ayrıldı, kendi rotası (`/antrenman`) oldu.
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
      {
        path: 'profile',
        element: <ProfileLayout />,
        children: [
          { index: true, element: <Navigate to="records" replace /> },
          { path: 'account', element: <ProfilePage /> },
          { path: 'measurements', element: <MeasurementsPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'records', element: <RecordsPage /> },
        ],
      },
      { path: 'history', element: <Navigate to="/profile/history" replace /> },
      { path: 'records', element: <Navigate to="/profile/records" replace /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
]);
