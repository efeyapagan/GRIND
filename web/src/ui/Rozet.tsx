import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

const TON = {
  // Dolu: accent zemin + on-accent metin. Acik: accent'in %20'si + accent-soft metin (spec Karar 2).
  dolu: 'bg-accent text-on-accent',
  acik: 'bg-accent/20 text-accent-soft',
} as const;

interface Props {
  children: ReactNode;
  ton?: keyof typeof TON;
  ikon?: LucideIcon;
  tamYuvarlak?: boolean;
}

/** Rozet: buyuk harf CSS ile (kaynak metin normal yazilir). */
export default function Rozet({ children, ton = 'dolu', ikon: Ikon, tamYuvarlak = false }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-label-xs uppercase ${TON[ton]} ${
        tamYuvarlak ? 'rounded-full' : 'rounded'
      }`}
    >
      {Ikon && <Ikon aria-hidden size={12} />}
      {children}
    </span>
  );
}
