import { useMemo } from 'react';
import type { SetKaydi } from '../api/queries';
import { formatWeight } from '../lib/format';

interface Props {
  sets: SetKaydi[];
}

interface EgzersizGrubu {
  exerciseId: number;
  exerciseName: string;
  sets: SetKaydi[];
}

/**
 * PR rozeti dogrudan sunucunun `recordType`'indan cizilir -- rekor istemcide YENIDEN
 * HESAPLANMAZ (spec). `None` icin rozet yok.
 */
function rekorRozetiMetni(kayit: SetKaydi): string | null {
  if (kayit.recordType === 'Weight') {
    return 'ağırlık rekoru';
  }
  if (kayit.recordType === 'Reps') {
    return 'tekrar rekoru';
  }
  return null;
}

/**
 * Setler egzersize gore gruplanir, grup icinde kronolojik sira korunur (spec) -- sunucu setleri
 * zaten kronolojik sirayla dondurur, burada sadece egzersize gore yeniden gruplaniyoruz. Bir
 * egzersizin ilk gorundugu sira grubun sirasini belirler.
 */
export default function SetList({ sets }: Props) {
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
    return <p>Bugün henüz set eklenmedi.</p>;
  }

  return (
    <div>
      {gruplar.map((grup) => (
        <section key={grup.exerciseId}>
          <h2>{grup.exerciseName}</h2>
          <ul>
            {grup.sets.map((kayit) => {
              const rozet = rekorRozetiMetni(kayit);
              return (
                <li key={kayit.id}>
                  {formatWeight(kayit.weight)} × {kayit.reps}
                  {kayit.rir !== null && ` (RIR ${kayit.rir})`}
                  {rozet && ` — ${rozet}`}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
