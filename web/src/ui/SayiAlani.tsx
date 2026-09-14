import type { Ref } from 'react';

interface Props {
  id: string;
  etiket: string;
  // Gorunmeyen ama erisilebilir ada giren ek (orn. " (kg)") -- etiket gorselde kisa kalir.
  ekranOkuyucuEki?: string;
  birim: string;
  inputMode: 'decimal' | 'numeric';
  placeholder: string;
  value: string;
  onChange: (deger: string) => void;
  hata?: string;
  girdiRef?: Ref<HTMLInputElement>;
}

/**
 * Set girisinin kompakt sayi alani (set paneli ve set duzenleyici ortak, #57). Girdi kutunun
 * TAMAMIDIR (60 px dokunma hedefi); etiket ve birim onun ustune bindirilir ve `pointer-events-none`
 * ile dokunmayi girdiye birakir. Birim `aria-hidden` -- erisilebilir ad etiketten gelir ("Ağırlık (kg)").
 */
export default function SayiAlani({
  id,
  etiket,
  ekranOkuyucuEki,
  birim,
  inputMode,
  placeholder,
  value,
  onChange,
  hata,
  girdiRef,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <span className="relative block">
        <input
          id={id}
          ref={girdiRef}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-15 w-full rounded-lg bg-inset pt-5 pr-12 pl-2 text-heading text-fg tabular-nums placeholder:text-muted/40 focus:bg-surface-2"
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute top-2 left-2 text-label-xs text-muted uppercase"
        >
          {etiket}
          {ekranOkuyucuEki && <span className="sr-only">{ekranOkuyucuEki}</span>}
        </label>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-2.5 text-label-xs text-muted"
        >
          {birim}
        </span>
      </span>
      {hata && <p role="alert" className="text-label text-danger">{hata}</p>}
    </div>
  );
}
