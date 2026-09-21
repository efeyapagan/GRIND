import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import { useGuncelTakvimOzeti, useRecords } from '../api/queries';
import { formatTarih, formatWeight } from '../lib/format';
import { usePageTitle } from '../ui/PageTitleContext';
import BosDurum from '../ui/BosDurum';
import Rozet from '../ui/Rozet';

/**
 * "Rekorlar" ekrani -- her egzersiz icin en agir seti ve en cok tekrari AYRI AYRI gosterir
 * (spec): bunlar cogu zaman farkli setlerdir. Sunucunun dondugu degerler oldugu gibi gosterilir,
 * istemci hicbir rekoru YENIDEN HESAPLAMAZ. Kartlar etkilesimsizdir.
 *
 * Baslik artik ust kabukta (issue #65) -- `usePageTitle` ile bildirilir, burada ayrica bir
 * `<h1>` YAZILMAZ. Alt aciklama ("Kişisel en iyiler") baslik degil, kalir.
 */
export default function RecordsPage() {
  const { t } = useTranslation();
  const dil = useDil();
  usePageTitle(t('kabuk.sekmeRekorlar'));
  const { data, isLoading, isError } = useRecords();
  // #117: en uzun seri Bugun'den buraya tasindi; tum gecmisten, sunucunun degeri.
  const { data: takvimOzeti } = useGuncelTakvimOzeti();

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      <p className="text-body text-muted">{t('rekorlar.altBaslik')}</p>

      {takvimOzeti && (
        <dl className="rounded-xl bg-surface-2 p-4">
          <div className="flex flex-col gap-1">
            <dt className="text-label text-muted">{t('rekorlar.enUzunSeri')}</dt>
            <dd className="text-metric tabular-nums">
              {t('takvim.haftaSayisi', { count: takvimOzeti.longestWeekStreak })}
            </dd>
          </div>
        </dl>
      )}

      {isLoading && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          {t('rekorlar.hata')}
        </p>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <BosDurum ikon={Trophy} baslik={t('rekorlar.bosBaslik')} />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <ul className="flex flex-col gap-4">
          {data.map((rekor) => (
            <li key={rekor.exerciseId} className="flex flex-col gap-4 rounded-xl bg-surface-2 p-4">
              <h2 className="flex items-center gap-2.5 text-heading">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
                {rekor.exerciseName}
              </h2>
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
                    <span className="text-metric tabular-nums">
                      {t('rekorlar.tekrarSayisi', { count: rekor.bestReps })}
                    </span>
                    <span className="text-body text-muted">@ {formatWeight(rekor.bestRepsWeight, dil)} kg</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
