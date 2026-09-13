import { Check } from 'lucide-react';
import type { HareketIlerlemesi, SetKaydi } from '../api/queries';
import SetList from './SetList';
import SetSatiri from './SetSatiri';

interface Props {
  ilerleme: HareketIlerlemesi[];
  setler: SetKaydi[];
  secilenId: number | null;
  onSec: (exerciseId: number) => void;
}

/**
 * Sablonlu oturumun hareket kartlari (spec Karar 5). Sira, hedef ve gerceklesen sayilar sunucunun
 * `progress`'inden gelir; setlerin kartlara dagitilmasi yalnizca sunumdur.
 *
 * Kart basligi bir `<button>`dir ve adi "Bench Press, 2 / 4 set"; setler dugmenin DISINDA durur
 * (dugme icinde liste, erisilebilir adi setlerle sisirirdi). Secim `aria-pressed` ile ve accent
 * KULLANMADAN (notr halka) gosterilir.
 */
export default function HareketKartlari({ ilerleme, setler, secilenId, onSec }: Props) {
  const planliIdler = new Set(ilerleme.map((hareket) => hareket.exerciseId));
  const planDisiSetler = setler.filter((kayit) => !planliIdler.has(kayit.exerciseId));

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-col gap-4">
        {ilerleme.map((hareket, sira) => {
          const secili = hareket.exerciseId === secilenId;
          const tamamlandi = hareket.completedSets >= hareket.plannedSets;
          const hareketSetleri = setler.filter((kayit) => kayit.exerciseId === hareket.exerciseId);

          return (
            <li
              key={hareket.exerciseId}
              className={`flex flex-col gap-2 rounded-xl bg-surface-1 p-4 ${secili ? 'ring-1 ring-muted' : ''}`}
            >
              <button
                type="button"
                aria-pressed={secili}
                aria-label={`${hareket.exerciseName}, ${hareket.completedSets} / ${hareket.plannedSets} set`}
                onClick={() => onSec(hareket.exerciseId)}
                className="flex min-h-12 w-full items-center justify-between gap-2 text-left"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-label"
                  >
                    {tamamlandi ? <Check size={18} /> : sira + 1}
                  </span>
                  <span className="truncate text-heading">{hareket.exerciseName}</span>
                </span>
                <span className="shrink-0 text-label-xs text-muted uppercase tabular-nums">
                  {hareket.completedSets} / {hareket.plannedSets} set
                </span>
              </button>
              {hareketSetleri.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {hareketSetleri.map((kayit, setSirasi) => (
                    <SetSatiri key={kayit.id} kayit={kayit} sira={setSirasi + 1} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {planDisiSetler.length > 0 && (
        <section aria-labelledby="plan-disi-basligi" className="flex flex-col gap-2">
          <h2 id="plan-disi-basligi" className="text-heading">
            Plan dışı
          </h2>
          <SetList sets={planDisiSetler} />
        </section>
      )}
    </div>
  );
}
