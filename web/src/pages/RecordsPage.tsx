import { useRecords } from '../api/queries';
import { formatTrDate, formatWeight } from '../lib/format';

/**
 * "Rekorlar" ekrani -- her egzersiz icin en agir seti ve en cok tekrari AYRI AYRI gosterir
 * (spec): bunlar cogu zaman farkli setlerdir, tek bir "en iyi" degere indirgemek bilgi
 * kaybettirir. Sunucunun dondugu degerler oldugu gibi gosterilir, istemci hicbir rekoru
 * YENIDEN HESAPLAMAZ. Polling yok -- liste yalnizca set eklenince (`useAddSet`in invalidate
 * ettigi `records` anahtari araciligiyla) tazelenir.
 */
export default function RecordsPage() {
  const { data, isLoading, isError } = useRecords();

  return (
    <div>
      <h1>Rekorlar</h1>

      {isLoading && <p>Yükleniyor...</p>}

      {isError && <p role="alert">Rekorlar alınamadı. Lütfen sayfayı yenileyin.</p>}

      {!isLoading && !isError && data && data.length === 0 && <p>Henüz rekor yok.</p>}

      {!isLoading && !isError && data && data.length > 0 && (
        <ul>
          {data.map((rekor) => (
            <li key={rekor.exerciseId}>
              <h2>{rekor.exerciseName}</h2>
              <p>
                En ağır set: {formatWeight(rekor.bestWeight)} × {rekor.bestWeightReps} (
                {formatTrDate(rekor.bestWeightAt)})
              </p>
              <p>
                En çok tekrar: {rekor.bestReps} × {formatWeight(rekor.bestRepsWeight)} (
                {formatTrDate(rekor.bestRepsAt)})
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
