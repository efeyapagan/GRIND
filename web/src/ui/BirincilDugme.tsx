import type { ButtonHTMLAttributes } from 'react';

// Stitch: "Set ekle" 56 px, giris/kayit dugmeleri 52 px.
const YUKSEKLIK = { buyuk: 'h-14', normal: 'h-13' } as const;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  yukseklik: keyof typeof YUKSEKLIK;
}

/** Accent dolgulu birincil eylem; ustundeki metin her zaman `on-accent` (spec Karar 2). */
export default function BirincilDugme({ yukseklik, type = 'button', ...dugme }: Props) {
  return (
    <button
      type={type}
      {...dugme}
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-accent text-body-lg font-bold text-on-accent disabled:opacity-60 ${YUKSEKLIK[yukseklik]}`}
    />
  );
}
