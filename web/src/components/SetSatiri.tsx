import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import type { SetKaydi } from '../api/queries';
import { formatWeight } from '../lib/format';
import { rekorRozetiMetni } from '../lib/rekor';
import Rozet from '../ui/Rozet';
import Hap from '../ui/Hap';
import DinlenmeHapi from '../ui/DinlenmeHapi';
import { kalanSureMetni } from '../lib/dinlenme';
import SetDuzenleyici from './SetDuzenleyici';

interface Props {
  kayit: SetKaydi;
  sira: number;
  onSil: (kayit: SetKaydi) => void;
}

/**
 * Bugun ekraninin set satiri: SetList'in 'bugun' gruplari ve sablonlu oturumun hareket kartlari ayni
 * satiri kullanir (DRY). Deger metni bosluklari `{' '}` ile acikca tasir (textContent tek parca).
 *
 * Issue #57: satirin KENDISI bir dugmedir -- ayri bir "Düzenle" dugmesi yok; dokununca satirin yerinde
 * `SetDuzenleyici` acilir, "Seti sil" onun icindedir. Dugmenin erisilebilir adi rozet ve RIR'i da
 * tasir (`aria-label` icerigi ezdigi icin) ve eylemi soyler. Duzenleyici kapaninca odak satira doner.
 */
export default function SetSatiri({ kayit, sira, onSil }: Props) {
  const { t } = useTranslation();
  const dil = useDil();
  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const satirRef = useRef<HTMLButtonElement>(null);
  const oncekiDuzenleniyor = useRef(duzenleniyor);

  useEffect(() => {
    if (oncekiDuzenleniyor.current && !duzenleniyor) {
      satirRef.current?.focus();
    }
    oncekiDuzenleniyor.current = duzenleniyor;
  }, [duzenleniyor]);

  if (duzenleniyor) {
    return (
      <SetDuzenleyici
        kayit={kayit}
        sira={sira}
        onKapat={() => setDuzenleniyor(false)}
        onSil={() => onSil(kayit)}
      />
    );
  }

  const rozet = rekorRozetiMetni(kayit);
  const erisilebilirAd = [
    t('setler.setSirasi', { sira }),
    `${formatWeight(kayit.weight, dil)} kg × ${kayit.reps}`,
    rozet,
    kayit.rir !== null ? `RIR ${kayit.rir}` : null,
    // aria-label icerigi ezdigi icin dinlenme de burada ayrica soylenir (#71).
    kayit.restSeconds !== null
      ? t('setler.dinlenmeSuresi', { sure: kalanSureMetni(kayit.restSeconds * 1000) })
      : null,
    t('setler.duzenle'),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <li>
      <button
        ref={satirRef}
        type="button"
        aria-label={erisilebilirAd}
        onClick={() => setDuzenleniyor(true)}
        className="flex w-full items-center justify-between gap-2 rounded-lg bg-surface-2 p-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-4">
          <span className="w-12 shrink-0 text-label text-muted">{t('setler.setSirasiGoster', { sira })}</span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-metric tabular-nums">
              {formatWeight(kayit.weight, dil)} <span className="text-body text-muted">kg</span>{' '}
              <span className="font-light text-muted">×</span> {kayit.reps}
            </span>
            {rozet && <Rozet>{rozet}</Rozet>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <DinlenmeHapi saniye={kayit.restSeconds} />
          {kayit.rir !== null && <Hap>RIR {kayit.rir}</Hap>}
        </span>
      </button>
    </li>
  );
}
