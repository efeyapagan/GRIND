import { Check, Trash2 } from 'lucide-react';
import type { HareketIlerlemesi, SetKaydi } from '../api/queries';
import HareketGecmisi from './HareketGecmisi';
import SetSatiri from './SetSatiri';

interface Props {
  ilerleme: HareketIlerlemesi[];
  setler: SetKaydi[];
  secilenId: number | null;
  onSec: (exerciseId: number) => void;
  // Bir setin duzenleyicisinde "Seti sil" (#57); geri alinabilir silmeyi sayfa yurutur.
  onSetSil: (kayit: SetKaydi) => void;
  // Secili kartta "Hareketi kaldir" (#60); geri alinabilir kaldirmayi sayfa yurutur.
  onHareketKaldir: (exerciseId: number) => void;
}

/** Kartin sayaci: hedefliyse "2 / 4 set", hedefsizse (#62) yalnizca "2 set". */
function setSayaci(hareket: HareketIlerlemesi): string {
  return hareket.plannedSets === null
    ? `${hareket.completedSets} set`
    : `${hareket.completedSets} / ${hareket.plannedSets} set`;
}

/**
 * Antrenmanin hareket kartlari (spec Karar 5; #60/#62). Sira, hedef ve gerceklesen sayilar sunucunun
 * `progress`'inden gelir -- antrenmandaki HER hareket bir karttir, "Plan disi" diye ayri bir bolum
 * yoktur (set girilen hareket sunucuda listeye girer). Setlerin kartlara dagitilmasi yalnizca sunumdur.
 *
 * Kart basligi bir `<button>`dir ve adi "Bench Press, 2 / 4 set"; setler dugmenin DISINDA durur
 * (dugme icinde liste, erisilebilir adi setlerle sisirirdi). Secim `aria-pressed` ile ve accent
 * KULLANMADAN (notr halka) gosterilir. Tamamlandi isareti yalnizca hedefli kartta.
 */
export default function HareketKartlari({ ilerleme, setler, secilenId, onSec, onSetSil, onHareketKaldir }: Props) {
  return (
    <ol className="flex flex-col gap-4">
      {ilerleme.map((hareket, sira) => {
        const secili = hareket.exerciseId === secilenId;
        const tamamlandi = hareket.plannedSets !== null && hareket.completedSets >= hareket.plannedSets;
        const hareketSetleri = setler.filter((kayit) => kayit.exerciseId === hareket.exerciseId);
        const sayac = setSayaci(hareket);

        return (
          <li
            key={hareket.exerciseId}
            className={`flex flex-col gap-2 rounded-xl bg-surface-1 p-4 ${secili ? 'ring-1 ring-muted' : ''}`}
          >
            <button
              type="button"
              aria-pressed={secili}
              aria-label={`${hareket.exerciseName}, ${sayac}`}
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
              <span className="shrink-0 text-label-xs text-muted uppercase tabular-nums">{sayac}</span>
            </button>
            {hareketSetleri.length > 0 && (
              <ul className="flex flex-col gap-1">
                {hareketSetleri.map((kayit, setSirasi) => (
                  <SetSatiri key={kayit.id} kayit={kayit} sira={setSirasi + 1} onSil={onSetSil} />
                ))}
              </ul>
            )}
            {secili && (
              <>
                <HareketGecmisi exerciseId={hareket.exerciseId} exerciseName={hareket.exerciseName} />
                <button
                  type="button"
                  onClick={() => onHareketKaldir(hareket.exerciseId)}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl text-label text-danger"
                >
                  <Trash2 aria-hidden size={18} />
                  Hareketi kaldır
                </button>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
