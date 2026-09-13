import { useMemo } from 'react';
import type { SetKaydi } from '../api/queries';
import { formatWeight } from '../lib/format';
import Rozet from '../ui/Rozet';
import Hap from '../ui/Hap';

interface Props {
  sets: SetKaydi[];
  // Bos durumda gosterilecek metin cagiran tarafa birakilir (T5): TodayPage "bugun" baglaminda
  // (varsayilan), HistoryPage ise gecmis bir gunu gosterirken "Bugün..." metnini KULLANAMAZ.
  bosDurumMetni?: string;
}

interface EgzersizGrubu {
  exerciseId: number;
  exerciseName: string;
  sets: SetKaydi[];
}

/**
 * PR rozeti dogrudan sunucunun `recordType`'indan cizilir -- rekor istemcide YENIDEN
 * HESAPLANMAZ (spec). `None` icin rozet yok. Buyuk harf CSS ile gelir.
 */
function rekorRozetiMetni(kayit: SetKaydi): string | null {
  if (kayit.recordType === 'Weight') {
    return 'Ağırlık rekoru';
  }
  if (kayit.recordType === 'Reps') {
    return 'Tekrar rekoru';
  }
  return null;
}

/**
 * Setler egzersize gore gruplanir, grup icinde kronolojik sira korunur (spec). Grup numarasi ve
 * "N SET" ekrandaki listenin sunumudur (satir sayisi), sunucu hesabinin tekrari degildir.
 *
 * Deger metni (`60 kg × 8`) bosluklari `{' '}` ile acikca tasir: textContent tek parca okunabilsin
 * (ekran okuyucu ve testler), gorsel olarak ise birim ve "×" soluk kalsin.
 */
export default function SetList({ sets, bosDurumMetni = 'Bugün henüz set eklenmedi.' }: Props) {
  const gruplar = useMemo(() => {
    const harita = new Map<number, EgzersizGrubu>();
    for (const kayit of sets) {
      const mevcutGrup = harita.get(kayit.exerciseId);
      if (mevcutGrup) {
        mevcutGrup.sets.push(kayit);
      } else {
        harita.set(kayit.exerciseId, {
          exerciseId: kayit.exerciseId,
          exerciseName: kayit.exerciseName,
          sets: [kayit],
        });
      }
    }
    return Array.from(harita.values());
  }, [sets]);

  if (gruplar.length === 0) {
    return <p className="text-body text-muted">{bosDurumMetni}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {gruplar.map((grup, grupSirasi) => (
        <section key={grup.exerciseId} className="flex flex-col gap-2 rounded-xl bg-surface-1 p-4">
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-label"
              >
                {grupSirasi + 1}
              </span>
              <h2 className="truncate text-heading">{grup.exerciseName}</h2>
            </div>
            <span className="shrink-0 text-label-xs text-muted uppercase">{grup.sets.length} set</span>
          </div>
          <ul className="flex flex-col gap-1">
            {grup.sets.map((kayit, setSirasi) => {
              const rozet = rekorRozetiMetni(kayit);
              return (
                <li
                  key={kayit.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 p-2"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="w-12 shrink-0 text-label text-muted">{setSirasi + 1}. Set</span>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-metric tabular-nums">
                        {formatWeight(kayit.weight)}{' '}
                        <span className="text-body text-muted">kg</span>{' '}
                        <span className="text-muted">×</span> {kayit.reps}
                      </span>
                      {rozet && <Rozet>{rozet}</Rozet>}
                    </div>
                  </div>
                  {kayit.rir !== null && <Hap>RIR {kayit.rir}</Hap>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
