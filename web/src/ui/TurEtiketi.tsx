import type { ReactNode } from 'react';

/**
 * Antrenman turu hapi (sablon adi ya da "Serbest"): notr, buyuk harf CSS ile. `accent` KULLANILMAZ
 * (gorsel tasarim spec'i Karar 2: accent rekorlara, birincil eyleme, aktif sekmeye ve markaya ayrildi).
 */
export default function TurEtiketi({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center truncate rounded-full bg-surface-3 px-2.5 py-1 text-label text-fg uppercase">
      {children}
    </span>
  );
}
