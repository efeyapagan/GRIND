import { useRef } from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const MENU_ID = 'hesap-menusu';

/**
 * Hesap menüsü (issue #119/#120): tek öğe "Çıkış yap" (spec Karar 8). Kullanıcı adı satırı ve
 * "Şablonlar" bağlantısı buradan KALKTI -- Profil artık alt menüde kendi sekmesi (kullanıcı adı
 * oraya taşındı), şablonlar Antrenman sayfasındaki "Şablonları yönet" bağlantısından erişilir
 * (`SablonlaBasla`). Aynı eylemi iki farklı menüde tutmak DRY'ı ihlal ederdi. Popover API: dışarı
 * dokununca ve Escape ile KENDİLİĞİNDEN kapanır.
 */
export default function HesapMenusu() {
  const { logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <button
        type="button"
        popoverTarget={MENU_ID}
        aria-label="Hesap menüsü"
        className="flex size-11 items-center justify-center rounded-full bg-surface-3 text-fg"
      >
        <User aria-hidden size={20} />
      </button>
      <div
        ref={menuRef}
        id={MENU_ID}
        popover="auto"
        // Golge Stitch'in "Level 3" degeri; token karsiligi yok, tek seferlik.
        className="inset-auto top-16 right-4 m-0 w-44 rounded-lg border-0 bg-surface-3 p-1 text-fg shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
      >
        <button
          type="button"
          onClick={logout}
          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-label text-danger"
        >
          <LogOut aria-hidden size={16} />
          Çıkış yap
        </button>
      </div>
    </>
  );
}
