import type { SetKaydi } from '../api/queries';
import { formatWeight } from '../lib/format';
import { rekorRozetiMetni } from '../lib/rekor';
import Rozet from '../ui/Rozet';
import Hap from '../ui/Hap';

/**
 * Bugun ekraninin set satiri: SetList'in 'bugun' gruplari ve sablonlu oturumun hareket kartlari ayni
 * satiri kullanir (DRY). Deger metni bosluklari `{' '}` ile acikca tasir (textContent tek parca).
 */
export default function SetSatiri({ kayit, sira }: { kayit: SetKaydi; sira: number }) {
  const rozet = rekorRozetiMetni(kayit);
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 p-2">
      <div className="flex min-w-0 items-center gap-4">
        <span className="w-12 shrink-0 text-label text-muted">{sira}. Set</span>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-metric tabular-nums">
            {formatWeight(kayit.weight)} <span className="text-body text-muted">kg</span>{' '}
            <span className="font-light text-muted">×</span> {kayit.reps}
          </span>
          {rozet && <Rozet>{rozet}</Rozet>}
        </div>
      </div>
      {kayit.rir !== null && <Hap>RIR {kayit.rir}</Hap>}
    </li>
  );
}
