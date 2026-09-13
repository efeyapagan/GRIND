import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { useHistory } from '../api/queries';
import { formatTrDate, formatWeight } from '../lib/format';
import SetList from '../components/SetList';
import BosDurum from '../ui/BosDurum';

// Sayfalama dugmeleri (Stitch: 52 px).
const SAYFA_DUGMESI =
  'flex h-13 flex-1 items-center justify-center gap-1 rounded-xl bg-surface-2 text-label uppercase disabled:text-muted disabled:opacity-60';

/**
 * "Gecmis" ekrani -- sunucunun sayfali zarfini oldugu gibi gosterir. Sira, sayfa bilgisi, toplam
 * sayi ve hacim TAMAMEN sunucudan gelir (spec); istemci hicbir seyi yeniden HESAPLAMAZ veya
 * SIRALAMAZ.
 *
 * Bir oturumun setleri (R12) yerinde acilan native `<details>` ile gosterilir -- setler yanitin
 * ICINDE geldigi icin ekstra istek yok; native eleman klavye/ekran okuyucu erisilebilirligini
 * kendiliginden saglar. `group-open:` o eleman acikken ozeti ve gostergeyi degistirir.
 * `[&::-webkit-details-marker]:hidden` Safari'nin varsayilan ucgenini gizler (`list-none` digerleri icin).
 *
 * Hata durumu bos durumdan AYRI ve ONCELIKLI gosterilir.
 */
export default function HistoryPage() {
  const [sayfa, setSayfa] = useState(1);
  const { data, isLoading, isError } = useHistory(sayfa);

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      <h1 className="text-title">Geçmiş</h1>

      {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          Geçmiş alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <BosDurum ikon={CalendarDays} baslik="Henüz antrenman geçmişi yok" />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-4">
            {data.items.map((oturum) => {
              const bos = oturum.setCount === 0;
              return (
                <li
                  key={oturum.sessionId}
                  className={`overflow-hidden rounded-xl bg-surface-2 ${bos ? 'opacity-80' : ''}`}
                >
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 group-open:bg-surface-3 [&::-webkit-details-marker]:hidden">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="flex items-center gap-1 text-label">
                          <CalendarDays aria-hidden size={18} className="text-muted" />
                          {formatTrDate(oturum.startedAt)}
                        </span>
                        <span className="flex items-baseline gap-4">
                          <span className="flex items-baseline gap-1">
                            <span className={`text-metric tabular-nums ${bos ? 'text-muted' : ''}`}>
                              {oturum.setCount}
                            </span>{' '}
                            <span className="text-label-xs text-muted uppercase">set</span>
                          </span>
                          <span className="flex items-baseline gap-1">
                            <span className={`text-metric tabular-nums ${bos ? 'text-muted' : ''}`}>
                              {formatWeight(oturum.totalVolume)}
                            </span>{' '}
                            <span className="text-label-xs text-muted uppercase">kg</span>
                          </span>
                        </span>
                      </div>
                      <span
                        aria-hidden
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted group-open:bg-surface-4 group-open:text-fg"
                      >
                        <ChevronDown size={20} className="group-open:hidden" />
                        <ChevronUp size={20} className="hidden group-open:block" />
                      </span>
                    </summary>
                    <div className="p-4">
                      <SetList varyant="gecmis" sets={oturum.sets} bosDurumMetni="Bu antrenmanda set yok." />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setSayfa((s) => s - 1)}
              disabled={data.page <= 1}
              className={SAYFA_DUGMESI}
            >
              <ChevronLeft aria-hidden size={18} />
              Önceki
            </button>
            <div className="flex shrink-0 flex-col items-center px-2">
              <span className="text-label tabular-nums">
                Sayfa {data.page} / {data.totalPages}
              </span>
              <span className="text-label-xs text-muted">{data.totalCount} antrenman</span>
            </div>
            <button
              type="button"
              onClick={() => setSayfa((s) => s + 1)}
              disabled={data.page >= data.totalPages}
              className={SAYFA_DUGMESI}
            >
              Sonraki
              <ChevronRight aria-hidden size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
