import type { SelectHTMLAttributes } from 'react';
import { ChevronsUpDown } from 'lucide-react';

/** Yerel `<select>` + sagda ok ikonu. Etiket cagiran taraftadir (`htmlFor` ile `id`). */
export default function SecimKutusu(secim: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...secim}
        className="h-12 w-full appearance-none rounded-lg bg-inset pr-10 pl-4 text-body-lg text-fg"
      />
      <ChevronsUpDown
        aria-hidden
        size={20}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
