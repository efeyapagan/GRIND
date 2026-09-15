import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, LogOut, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const MENU_ID = 'hesap-menusu';
const MENU_OGESI = 'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-label';

/**
 * Hesap menusu: kullanici adi (profile giden baglanti, issue #65), "Sablonlar" ve "Cikis yap"
 * (dilim 2 spec Karar 2 -- sablonlar sekme degil). Popover API: disari dokununca ve Escape ile
 * KENDILIGINDEN kapanir.
 *
 * Menu icindeki bir baglanti tiklaninca popover kendiliginden KAPANMAZ (kabuk sayfa degisince de
 * yerinde durur) -- bu yuzden `hidePopover` elle cagrilir. jsdom Popover API'yi uygulamadigi icin
 * cagri istege bagli.
 */
export default function HesapMenusu() {
  const { username, logout } = useAuth();
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
        {username && (
          <Link
            to="/profile"
            onClick={() => menuRef.current?.hidePopover?.()}
            className={`${MENU_OGESI} truncate text-fg`}
          >
            <User aria-hidden size={16} className="shrink-0" />
            <span className="truncate">{username}</span>
          </Link>
        )}
        <Link to="/templates" onClick={() => menuRef.current?.hidePopover?.()} className={`${MENU_OGESI} text-fg`}>
          <ClipboardList aria-hidden size={16} />
          Şablonlar
        </Link>
        <button type="button" onClick={logout} className={`${MENU_OGESI} text-danger`}>
          <LogOut aria-hidden size={16} />
          Çıkış yap
        </button>
      </div>
    </>
  );
}
