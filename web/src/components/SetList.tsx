import { useMemo } from 'react';
import { Flame, Zap } from 'lucide-react';
import { useDil } from '@grind/shared/i18n';
import type { SetKaydi } from '../api/queries';
import { formatWeight } from '../lib/format';
import { rekorRozetiMetni } from '../lib/rekor';
import Rozet from '../ui/Rozet';
import Hap from '../ui/Hap';
import DinlenmeHapi from '../ui/DinlenmeHapi';
import SetSatiri from './SetSatiri';

interface OrtakProps {
  sets: SetKaydi[];
  // Bos durumda gosterilecek metin cagiran tarafa birakilir (T5): TodayPage "bugun" baglaminda
  // (varsayilan), HistoryPage ise gecmis bir gunu gosterirken "Bugün..." metnini KULLANAMAZ.
  bosDurumMetni?: string;
}

// 'bugun': buyuk degerli kart satirlari (Bugun); satira dokununca duzenlenir, silme `onSetSil` ile
// sayfaya bildirilir (#57) -- bu yuzden o varyantta ZORUNLU. 'gecmis': Gecmis kartinin icinde kompakt,
// salt okunur satirlar.
type Props = OrtakProps &
  ({ varyant?: 'bugun'; onSetSil: (kayit: SetKaydi) => void } | { varyant: 'gecmis' });

interface EgzersizGrubu {
  exerciseId: number;
  exerciseName: string;
  sets: SetKaydi[];
}

/**
 * Setler egzersize gore gruplanir, grup icinde kronolojik sira korunur (spec). Grup numarasi ve
 * "N SET" ekrandaki listenin sunumudur (satir sayisi), sunucu hesabinin tekrari degildir.
 *
 * Deger metni (`60 kg × 8`) bosluklari `{' '}` ile acikca tasir: textContent tek parca okunabilsin
 * (ekran okuyucu ve testler), gorsel olarak ise birim ve "×" soluk kalsin.
 */
export default function SetList(props: Props) {
  const dil = useDil();
  const { sets, bosDurumMetni = 'Bugün henüz set eklenmedi.' } = props;
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

  if (props.varyant === 'gecmis') {
    return (
      <div className="flex flex-col gap-5">
        {gruplar.map((grup) => (
          <section key={grup.exerciseId} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <h3 className="truncate text-body-lg font-semibold">{grup.exerciseName}</h3>
              <span className="shrink-0 rounded bg-surface-1 px-2 py-0.5 text-label-xs text-muted uppercase">
                {grup.sets.length} set
              </span>
            </div>
            <ul className="flex flex-col gap-1">
              {grup.sets.map((kayit, setSirasi) => {
                const rozet = rekorRozetiMetni(kayit);
                return (
                  <li
                    key={kayit.id}
                    className="flex min-h-12 flex-col justify-center gap-1.5 rounded-lg bg-surface-1 px-4 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-4">
                        <span className="w-5 text-label text-muted">{setSirasi + 1}</span>
                        <span className="text-body-lg tabular-nums">
                          {formatWeight(kayit.weight, dil)} kg{' '}
                          <span className="font-light text-muted">×</span> {kayit.reps}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DinlenmeHapi saniye={kayit.restSeconds} />
                        {kayit.rir !== null && <Hap>RIR {kayit.rir}</Hap>}
                      </div>
                    </div>
                    {rozet && (
                      <div>
                        <Rozet ikon={kayit.recordType === 'Weight' ? Zap : Flame} tamYuvarlak>
                          {rozet}
                        </Rozet>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    );
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
            {grup.sets.map((kayit, setSirasi) => (
              <SetSatiri key={kayit.id} kayit={kayit} sira={setSirasi + 1} onSil={props.onSetSil} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
