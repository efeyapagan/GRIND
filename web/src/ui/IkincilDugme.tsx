import type { ButtonHTMLAttributes } from 'react';

/** Notr ikincil eylem (ör. "Hareket ekle", "Vazgec"); accent YOK. */
export default function IkincilDugme({ type = 'button', ...dugme }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...dugme}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-3 px-4 text-label text-fg disabled:opacity-60"
    />
  );
}
