import { LogOut, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const MENU_ID = 'hesap-menusu';

/**
 * Hesap menusu -- tek ogesi "Cikis yap" (spec Karar 8). Popover API kullanilir: menu disari
 * dokununca ve Escape ile KENDILIGINDEN kapanir, ek JS/durum gerekmez; tetikleyici tarayicida
 * aria-expanded'i da kendisi tasir.
 *
 * Popover ust katmanda (top layer) acilir ve tarayicinin varsayilan stili onu ekranin ortasina
 * koyar (`inset: 0; margin: auto`) -- `inset-auto m-0` ile bunu sifirlayip basligin hemen altina,
 * saga hizaliyoruz. Varsayilan kenarlik ve ic bosluk da `border-0 p-1` ile ezilir.
 */
export default function HesapMenusu() {
  const { logout } = useAuth();

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
