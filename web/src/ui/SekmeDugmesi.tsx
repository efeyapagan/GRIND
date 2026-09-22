import type { ButtonHTMLAttributes } from 'react';
import Parilti from './Parilti';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  secili: boolean;
}

/**
 * `role="tablist"` icindeki tek sekme: aktif sekmenin alt cizgisi `accent-fg` (spec Karar 3 --
 * accent'in on plan/foreground formu, alt cizgi de bir foreground isaretidir), pasifler `muted`.
 * Aktif sekmede alt cizgiden yukari sonen turuncu parilti (#243). Hareket grafigi ve Takvim (#81)
 * ortak kullanir.
 */
export default function SekmeDugmesi({ secili, type = 'button', children, ...dugme }: Props) {
  return (
    <button
      type={type}
      role="tab"
      aria-selected={secili}
      {...dugme}
      className={`relative min-h-11 flex-1 border-b-2 px-2 text-label ${
        secili ? 'border-accent-fg text-fg' : 'border-transparent text-muted'
      }`}
    >
      {secili && <Parilti bicim="alt" />}
      <span className="relative">{children}</span>
    </button>
  );
}
