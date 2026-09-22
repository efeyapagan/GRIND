import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Listedeki tek oge icin surukleme baglantisi. `stil`: dnd-kit'in surukleme sirasindaki ofseti
 * (translate) ve gecisi yalnizca calisma anindaki sayisal degerlerdir, sabit bir Tailwind sinifiyla
 * ifade edilemez -- projenin "satir ici style yok" kuralinin istisnasi, dnd-kit'in resmi API'si bunu
 * boyle ister (gorsel bir tasarim tercihi degil, surukleme fizigi).
 */
export function useSuruklenebilirOge(anahtar: number) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: anahtar });
  return {
    dugumuBagla: setNodeRef,
    stil: { transform: CSS.Transform.toString(transform), transition },
    tutamac: { attributes, listeners },
    surukleniyor: isDragging,
  };
}
