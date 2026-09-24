import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import type { EgzersizRekoru, Plato } from '../api/queries';
import { formatTarih, formatWeight } from '../lib/format';
import Rozet from '../ui/Rozet';

/**
 * Bir hareketin rekor kartı: en ağır set ve en çok tekrar AYRI AYRI (çoğu zaman farklı setlerdir).
 * Değerler sunucunun, istemci yeniden hesaplamaz. Kendi Rekorlar sekmen ve arkadaşın rekorları (#284)
 * aynı kartı çizer; plato (#72) yalnızca kendi rekorlarında gelir.
 */
export default function RekorKarti({ rekor, plato }: { rekor: EgzersizRekoru; plato?: Plato }) {
  const { t } = useTranslation();
  const dil = useDil();

  return (
    <li className="flex flex-col gap-4 rounded-xl bg-surface-2 p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2.5 text-heading">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
            {rekor.exerciseName}
          </h2>
          {plato && <Rozet ton="acik">{t('rekorlar.plato')}</Rozet>}
        </div>
        {plato && (
          <p className="text-label-xs text-muted">
            {t('rekorlar.platoAciklama', {
              count: plato.weeks,
              kg: formatWeight(plato.bestOneRepMax, dil),
            })}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1 rounded-lg bg-surface-1 p-3">
          <p className="flex items-center gap-1.5">
            <Rozet>{t('rekorlar.enAgirSet')}</Rozet>
            <span className="text-label-xs text-muted">· {formatTarih(rekor.bestWeightAt, dil)}</span>
          </p>
          <p className="flex items-baseline gap-1">
            <span className="text-metric tabular-nums">{formatWeight(rekor.bestWeight, dil)} kg</span>
            <span className="text-body-lg font-bold text-accent-soft">× {rekor.bestWeightReps}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-surface-1 p-3">
          <p className="flex items-center gap-1.5">
            <Rozet ton="acik">{t('rekorlar.enCokTekrar')}</Rozet>
            <span className="text-label-xs text-muted">· {formatTarih(rekor.bestRepsAt, dil)}</span>
          </p>
          <p className="flex items-baseline gap-1.5">
            <span className="text-metric tabular-nums">{t('rekorlar.tekrarSayisi', { count: rekor.bestReps })}</span>
            <span className="text-body text-muted">@ {formatWeight(rekor.bestRepsWeight, dil)} kg</span>
          </p>
        </div>
      </div>
    </li>
  );
}
