import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

/**
 * Korumalı alanın ortak yerleşim köküdür -- gerçek sayfa içeriği `routes.tsx`'teki alt
 * route'lardan `Outlet` ile gelir. Navigasyon ve çıkış BURADA yaşar (R10/R11) -- `routes.tsx`
 * sadece route konfigürasyonu tutar, bir layout elemanı olmadan link render edemez.
 *
 * `NavLink` kullanılır: aktif sayfanın bağlantısı `aria-current="page"`yi KENDİLİĞİNDEN taşır,
 * bunu elle hesaplamaya gerek yok. Çıkıştan sonra `ProtectedRoute` zaten `/login`'e yönlendirir
 * (spec) -- burada elle bir `navigate` çağrısı YAPILMAZ, o mantık tekrarlanmaz (DRY).
 *
 * Görsel tasarım bilerek yok: CSS, className, stil YOK -- sadece semantik `<nav>` ve `<button>`.
 */
export default function App() {
  const { logout } = useAuth();

  return (
    <div>
      <nav>
        <NavLink to="/" end>
          Bugün
        </NavLink>
        <NavLink to="/history">Geçmiş</NavLink>
        <NavLink to="/records">Rekorlar</NavLink>
        <button type="button" onClick={logout}>
          Çıkış yap
        </button>
      </nav>
      <Outlet />
    </div>
  );
}
