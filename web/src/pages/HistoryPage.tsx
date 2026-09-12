import { useState } from 'react';
import { useHistory } from '../api/queries';
import { formatTrDate, formatWeight } from '../lib/format';
import SetList from '../components/SetList';

/**
 * "Gecmis" ekrani -- sunucunun sayfali zarfini oldugu gibi gosterir. Sira, toplam sayfa sayisi
 * ve hacim TAMAMEN sunucudan gelir (spec); istemci burada hicbir seyi yeniden HESAPLAMAZ veya
 * yeniden SIRALAMAZ.
 *
 * Bir oturumun setleri (R12) ayri bir istek/route ACMADAN, yerinde acilan native `<details>` ile
 * gosterilir -- setler yanitin zaten ICINDE geldigi icin bu ekstra bir ag cagrisi gerektirmez ve
 * native eleman klavye/ekran okuyucu erisilebilirligini CSS'siz saglar (gorsel tasarim yok).
 *
 * TodayPage'deki gibi hata durumu bos durumdan AYRI ve ONCELIKLI gosterilir -- bir sunucu
 * kesintisini "hic gecmis yok" ile karistirmak, gercekte var olan bir gecmisi gizler.
 */
export default function HistoryPage() {
  const [sayfa, setSayfa] = useState(1);
  const { data, isLoading, isError } = useHistory(sayfa);

  return (
    <div>
      <h1>Geçmiş</h1>

      {isLoading && <p>Yükleniyor...</p>}

      {isError && <p role="alert">Geçmiş alınamadı. Lütfen sayfayı yenileyin.</p>}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <p>Henüz antrenman geçmişi yok.</p>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul>
            {data.items.map((oturum) => (
              <li key={oturum.sessionId}>
                <details>
                  <summary>
                    {formatTrDate(oturum.startedAt)} — {oturum.setCount} set —{' '}
                    {formatWeight(oturum.totalVolume)} kg
                  </summary>
                  <SetList sets={oturum.sets} bosDurumMetni="Bu oturumda set yok." />
                </details>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setSayfa((s) => s - 1)} disabled={data.page <= 1}>
            Önceki
          </button>
          <button
            type="button"
            onClick={() => setSayfa((s) => s + 1)}
            disabled={data.page >= data.totalPages}
          >
            Sonraki
          </button>
        </>
      )}
    </div>
  );
}
