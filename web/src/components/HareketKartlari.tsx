import { Check, CirclePlay, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
function setSayaci(hareket: HareketIlerlemesi, t: TFunction): string {
  return hareket.plannedSets === null
    ? t('setler.setSayisi', { count: hareket.completedSets })
    : t('setler.setIlerlemesi', {
        count: hareket.plannedSets,
        completed: hareket.completedSets,
        planned: hareket.plannedSets,
      });
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
  const { t } = useTranslation();
  return (
    <ol className="flex flex-col gap-4">
      {ilerleme.map((hareket, sira) => {
        const secili = hareket.exerciseId === secilenId;
        const tamamlandi = hareket.plannedSets !== null && hareket.completedSets >= hareket.plannedSets;
        const hareketSetleri = setler.filter((kayit) => kayit.exerciseId === hareket.exerciseId);
        const sayac = setSayaci(hareket, t);

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
                {/* Pasif play (#129): medya (gif/video) henuz yok, soluk ve basilamaz. Kart basligi zaten bir
                    dugme; medya gelince gercek bir dugmeye donusurken baslik yapisi ayrica ele alinir. */}
                <CirclePlay aria-hidden size={18} className="shrink-0 text-muted opacity-50" />
              </span>
              {/* "+" yalnizca ipucu (#126): karta dokununca set eklenebilecegini gosterir; adi degistirmez. */}
              <span className="flex shrink-0 items-center gap-1 text-label-xs text-muted uppercase tabular-nums">
                {sayac}
                <Plus aria-hidden size={14} />
              </span>
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
                  {t('antrenman.hareketiKaldir')}
                </button>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
