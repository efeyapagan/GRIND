import { Timer } from 'lucide-react';
import { kalanSureMetni } from '../lib/dinlenme';

/**
 * Setten once GERCEKTE ne kadar dinlenildigi (#71), `m:ss`. Sure sunucudan gelir (oturumdaki bir onceki
 * sete gore); istemcide hesaplanmaz. `null` (oturumun ilk seti) hicbir sey cizmez: "0:00" ilk setten
 * once dinlenilmis gibi okunurdu. Geri sayim sayacinin hedef suresiyle karistirilmasin.
 */
export default function DinlenmeHapi({ saniye }: { saniye: number | null }) {
  if (saniye === null) {
    return null;
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-label-xs text-muted tabular-nums">
      <Timer aria-hidden size={14} />
      <span className="sr-only">Dinlenme </span>
      <span>{kalanSureMetni(saniye * 1000)}</span>
    </span>
  );
}
