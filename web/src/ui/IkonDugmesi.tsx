import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  // Yalnizca ikondan olusan dugmenin erisilebilir adi (zorunlu).
  etiket: string;
}

/** 44 px kare ikon dugmesi; icerige `aria-hidden` bir lucide ikonu verilir. */
export default function IkonDugmesi({ etiket, type = 'button', ...dugme }: Props) {
  return (
    <button
      type={type}
      aria-label={etiket}
      {...dugme}
      className="flex size-11 items-center justify-center rounded-lg bg-surface-3 text-muted disabled:opacity-40"
    />
  );
}
