import type { ReactNode } from 'react';

/** Rekor rozeti: accent dolgu + on-accent metin; buyuk harf CSS ile (kaynak metin normal). */
export default function Rozet({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-label-xs text-on-accent uppercase">
      {children}
    </span>
  );
}
