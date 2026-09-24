import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Parilti from '../ui/Parilti';

export interface ProfilSekmesi {
  to: string;
  etiketAnahtari: 'kabuk.sekmeGecmis' | 'kabuk.sekmeRekorlar' | 'kabuk.sekmeOlcumler';
  ikon: LucideIcon;
}

/**
 * Profil başlığının altındaki yalnızca ikonlu sekmeler (#283; etiket `aria-label`'da). Kendi profilin
 * ve arkadaşın profili (#284) aynı çubuğu kullanır, sekme listesi çağırandan gelir. Rota-tabanlı olduğu
 * için ARIA `tab`/`tablist` rolü BİLEREK kullanılmaz (her sekme gerçek bir URL'e sahip ayrı bir sayfadır)
 * -- alt menüyle (`App.tsx`) aynı düz `nav` deseni.
 */
export default function ProfilSekmeleri({ sekmeler }: { sekmeler: readonly ProfilSekmesi[] }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('kabuk.profilSekmeleri')} className="flex border-b border-surface-3">
      {sekmeler.map(({ to, etiketAnahtari, ikon: Ikon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={t(etiketAnahtari)}
          title={t(etiketAnahtari)}
          className={({ isActive }) =>
            `relative flex min-h-11 flex-1 items-center justify-center border-b-2 px-2 ${
              isActive ? 'border-accent-fg text-fg' : 'border-transparent text-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <Parilti bicim="alt" />}
              <Ikon aria-hidden size={22} className="relative" />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
