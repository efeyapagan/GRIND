import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { ProtectedRoute } from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TodayPage from './pages/TodayPage';
import HistoryPage from './pages/HistoryPage';
import RecordsPage from './pages/RecordsPage';

/**
 * `/`, `/history` ve `/records` TEK bir `ProtectedRoute` altında toplanır (DRY) -- üçünü ayrı
 * ayrı sarmak yerine ortak kök route'u bir kere korumalı kılmak, aynı kontrolü tekrarlamaz.
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
      { index: true, element: <TodayPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'records', element: <RecordsPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
]);
