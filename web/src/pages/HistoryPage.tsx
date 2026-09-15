import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Brain, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { oturumSilindiTazele, oturumuSil, useHistory, type GecmisOturum } from '../api/queries';
import { GERI_AL_MS, useGecikmeliSilme } from '../lib/gecikmeliSilme';
import { sallamaIzniIste, useSallama } from '../lib/sallama';
import GecmisKarti from '../components/GecmisKarti';
import BosDurum from '../ui/BosDurum';
import GeriAlSeridi from '../ui/GeriAlSeridi';
import { usePageTitle } from '../ui/PageTitleContext';

// Sayfalama dugmeleri (Stitch: 52 px).
const SAYFA_DUGMESI =
  'flex h-13 flex-1 items-center justify-center gap-1 rounded-xl bg-surface-2 text-label uppercase disabled:text-muted disabled:opacity-60';

/**
 * "Gecmis" ekrani -- sunucunun sayfali zarfini oldugu gibi gosterir. Sira, sayfa bilgisi, toplam
 * sayi ve hacim TAMAMEN sunucudan gelir (spec); istemci hicbir seyi yeniden HESAPLAMAZ veya
 * SIRALAMAZ. Hata durumu bos durumdan AYRI ve ONCELIKLI gosterilir.
 *
 * Silme (issue #46) GECIKMELIDIR: onaydan sonra kart listeden hemen kalkar ama DELETE istegi
 * ancak geri alma penceresi kapaninca gider. Sebep teknik ve baglayici -- API silinmis bir
 * antrenmani setleriyle birlikte GERI GETIREMEZ (`POST /api/sessions` yalnizca BUGUN icin bos
 * bir oturum acar), yani "once sil, geri alinirsa yeniden olustur" mumkun degil. Tek durust
 * geri alma, silmeyi henuz yapmamis olmaktir.
 *
 * Pencere acikken sayfadan cikilirsa silme IPTAL EDILMEZ, kaldirma (unmount) sirasinda
 * tamamlanir: kullanici "sildim" dedi, geri almadi.
 */
export default function HistoryPage() {
  usePageTitle('Geçmiş');
  const [sayfa, setSayfa] = useState(1);
  const { data, isLoading, isError } = useHistory(sayfa);
  // Sorgu istemcisi baglamdan gelir ve uygulama boyunca AYNI ornektir; bu yuzden dogrudan
  // bagimlilik olarak kullanilabilir, ref'e kopyalanmasi gerekmez.
  const queryClient = useQueryClient();
  const silmeyiTamamla = useCallback(
    (oturum: GecmisOturum) => {
      void oturumuSil(oturum.sessionId).then(
        () => oturumSilindiTazele(queryClient, oturum.sessionId),
        // Gecikmis silme basarisiz olursa gosterilecek bir yer yok (serit kalkti, sayfa degismis
        // olabilir). Liste sunucu dogrulugundan beslendigi icin oturum bir sonraki ziyarette geri
        // gorunur -- sessiz bir veri kaybi olusmaz.
        () => undefined,
      );
    },
    [queryClient],
  );
  // Bekleyen oge, geri alma penceresi ve kaldirilinca tamamlama Bugun ekraninin set silmesiyle ORTAK (#57).
  const { bekleyen, baslat, geriAl, sureDoldu } = useGecikmeliSilme(silmeyiTamamla);

  function silmeyiBaslat(oturum: GecmisOturum) {
    baslat(oturum);
    // iOS hareket sensoru ACIK izin ister ve izin ancak bir kullanici hareketinden istenebilir --
    // buradaki silme onayi o hareketin ta kendisi. Sonuc beklenmez: izin verilmese de (ya da API
    // hic yoksa) seritteki "Geri al" dugmesi calismaya devam eder.
    void sallamaIzniIste();
  }

  useSallama(bekleyen !== null, geriAl);

  // Bekleyen silme listeden hemen kalkar; geri alinirsa sunucudan silinmedigi icin oldugu gibi doner.
  const gorunenler = data?.items.filter((o) => o.sessionId !== bekleyen?.sessionId) ?? [];

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      {/* Issue #76: POST /api/insights bir oturuma degil TARIH ARALIGINA gore calisir -- bu
          yuzden bir sablon/hesap ayari degil, Gecmis'in kendi bir uzantisidir. Tam genislikte,
          IkincilDugme ile AYNI sinif kumesi (o bir <button>, bu bir <Link> oldugu icin dogrudan
          bilesen kullanilamiyor -- gorunum birebir kopyalanir). */}
      <Link
        to="/insights"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-3 px-4 text-label text-fg"
      >
        <Brain aria-hidden size={18} />
        AI yorumu
      </Link>

      {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          Geçmiş alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {!isLoading && !isError && data && gorunenler.length === 0 && (
        <BosDurum ikon={CalendarDays} baslik="Henüz antrenman geçmişi yok" />
      )}

      {!isLoading && !isError && data && gorunenler.length > 0 && (
        <>
          <ul className="flex flex-col gap-4">
            {gorunenler.map((oturum) => (
              <GecmisKarti
                key={oturum.sessionId}
                oturum={oturum}
                onSil={() => silmeyiBaslat(oturum)}
              />
            ))}
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

      {bekleyen && (
        <GeriAlSeridi
          // `key`: ard arda iki silmede serit YENIDEN monte olsun, pencere bastan baslasin.
          key={bekleyen.sessionId}
          mesaj="Antrenman silindi"
          sureMs={GERI_AL_MS}
          onGeriAl={geriAl}
          onSureDoldu={sureDoldu}
        />
      )}
    </div>
  );
}
