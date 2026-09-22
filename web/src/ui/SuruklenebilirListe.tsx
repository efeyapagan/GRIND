import type { ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DraggableAttributes,
  type DragEndEvent,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface Props {
  anahtarlar: number[];
  /** Surukleme bitince: `aktif` ogesi `hedef`in yerine birakildi (ayni yere birakmak cagirmaz). */
  onTasi: (aktif: number, hedef: number) => void;
  children: ReactNode;
}

/**
 * Basili tutup surukleyerek siralanan dikey liste (#118 sablon formu, #229 antrenman). Ok dugmeleri
 * (yukari/asagi) bunun YERINE degil YANINDA durur: klavye/ekran okuyucu yolu onlarda kalir. Sonuc
 * `onTasi` ile cagirana verilir; sirayi cagiranin tek durumu tutar, ikinci bir sira kaynagi olusmaz.
 */
export default function SuruklenebilirListe({ anahtarlar, onTasi, children }: Props) {
  const sensorler = useSensors(
    useSensor(PointerSensor, {
      // Kucuk bir dokunma/tiklama surukleme baslatmasin; sayfa kaydirmasi da bununla bozulmaz.
      activationConstraint: { distance: 8 },
    }),
  );

  function surukleBitince({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      onTasi(Number(active.id), Number(over.id));
    }
  }

  return (
    <DndContext
      sensors={sensorler}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={surukleBitince}
    >
      <SortableContext items={anahtarlar} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/**
 * Surukleme tutamaci. `aria-hidden` ve tab sirasindan CIKARILIR (`tabIndex={-1}`) -- ekran okuyucuya
 * ikinci, calismayan bir kontrol sunmamak icin (klavye ile surukleme kurulmadi, yalnizca PointerSensor
 * var). `touch-none` yalnizca tutamacta: kartin geri kalaninda dikey kaydirma bozulmaz (#46).
 */
export function SurukleTutamaci({
  tutamac,
}: {
  tutamac: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners };
}) {
  return (
    <span
      {...tutamac.attributes}
      {...tutamac.listeners}
      aria-hidden
      tabIndex={-1}
      className="flex size-11 shrink-0 touch-none items-center justify-center rounded-lg text-muted active:cursor-grabbing"
    >
      <GripVertical aria-hidden size={20} />
    </span>
  );
}
