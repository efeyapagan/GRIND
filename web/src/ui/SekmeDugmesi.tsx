import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  secili: boolean;
}

/**
 * `role="tablist"` icindeki tek sekme: aktif sekmenin alt cizgisi `accent` (spec Karar 2), pasifler
 * `muted`. Hareket grafigi ve Takvim (#81) ortak kullanir.
 */
export default function SekmeDugmesi({ secili, type = 'button', ...dugme }: Props) {
  return (
    <button
      type={type}
      role="tab"
      aria-selected={secili}
      {...dugme}
      className={`min-h-11 flex-1 border-b-2 px-2 text-label ${
        secili ? 'border-accent text-fg' : 'border-transparent text-muted'
      }`}
    />
  );
}
