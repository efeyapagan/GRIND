import type { InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface AlanProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  etiket: string;
  ikon: LucideIcon;
  ipucu?: string;
  hata?: string;
  // Girdinin sagina bindirilen ek (orn. sifre goster dugmesi).
  sagEk?: ReactNode;
}

/**
 * Giris/kayit alani (spec, ortak auth duzeni): etiket ustte, solda sus ikonu, altta ipucu ve hata.
 * Ipucu `aria-describedby` ile girdiye baglanir.
 */
export default function Alan({ id, etiket, ikon: Ikon, ipucu, hata, sagEk, ...girdi }: AlanProps) {
  const ipucuId = ipucu ? `${id}-ipucu` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label text-fg">
        {etiket}
      </label>
      <div className="relative flex items-center">
        <Ikon aria-hidden size={20} className="pointer-events-none absolute left-3 text-muted" />
        <input
          id={id}
          aria-describedby={ipucuId}
          {...girdi}
          className={`h-12 w-full rounded-xl bg-surface-2 pl-10 text-body text-fg placeholder:text-muted/50 focus:bg-surface-3 ${
            sagEk ? 'pr-12' : 'pr-4'
          }`}
        />
        {sagEk && <div className="absolute right-0.5">{sagEk}</div>}
      </div>
      {ipucu && (
        <p id={ipucuId} className="pl-1 text-label text-muted">
          {ipucu}
        </p>
      )}
      {hata && (
        <p role="alert" className="pl-1 text-label text-danger">
          {hata}
        </p>
      )}
    </div>
  );
}
