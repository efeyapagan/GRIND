import type { ReactNode } from 'react';

/** Kucuk bilgi hapi (orn. "RIR 2"). */
export default function Hap({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded bg-surface-3 px-2 py-1 text-label text-muted tabular-nums">
      {children}
    </span>
  );
}
