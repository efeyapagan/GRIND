import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * `isAuthenticated` false ise `/login`'e `replace` ile yönlendirir -- kullanıcı geri tuşuyla
 * korumalı sayfaya dönmeye çalışırsa geçmişte login<->korumalı gidiş-gelişi birikmesin.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
