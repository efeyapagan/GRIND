import type { LucideIcon } from 'lucide-react';

interface Props {
  ikon: LucideIcon;
  baslik: string;
  aciklama?: string;
}

/** Ortali bos durum: daire icinde ikon, baslik ve istege bagli aciklama (Stitch bos durumu). */
export default function BosDurum({ ikon: Ikon, baslik, aciklama }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Ikon aria-hidden size={32} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-heading">{baslik}</h2>
        {aciklama && <p className="text-body text-muted">{aciklama}</p>}
      </div>
    </div>
  );
}
