import type { ButtonHTMLAttributes, Ref } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  // React 19: fonksiyon bilesenleri `ref`i forwardRef OLMADAN normal bir prop olarak alabilir.
  ref?: Ref<HTMLButtonElement>;
}

/** Notr ikincil eylem (ör. "Hareket ekle", "Vazgec"); accent YOK. */
export default function IkincilDugme({ type = 'button', ref, ...dugme }: Props) {
  return (
    <button
      ref={ref}
      type={type}
      {...dugme}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-3 px-4 text-label text-fg disabled:opacity-60"
    />
  );
}
