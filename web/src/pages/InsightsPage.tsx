import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ChevronLeft, Sparkles, Trash2 } from 'lucide-react';
import { useDeleteInsight, useGenerateInsight, useInsights, type Yorum } from '../api/queries';
import { ApiError } from '../api/problem';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { formatTrDate, formatTrTime } from '../lib/format';
import { usePageTitle } from '../ui/PageTitleContext';
import BirincilDugme from '../ui/BirincilDugme';
import IkincilDugme from '../ui/IkincilDugme';
import IkonDugmesi from '../ui/IkonDugmesi';
import BosDurum from '../ui/BosDurum';
import HataKutusu from '../ui/HataKutusu';

// Sayfalama dugmeleri (HistoryPage ile ayni stil, Stitch: 52 px).
const SAYFA_DUGMESI =
  'flex h-13 flex-1 items-center justify-center gap-1 rounded-xl bg-surface-2 text-label uppercase disabled:text-muted disabled:opacity-60';

/**
 * "AI yorumu" ekrani (issue #76). Backend'in `POST /api/insights`'i bir TARIH ARALIGINA gore
 * calisir (belirli bir oturuma degil, govde gondermezsek son 30 gun) -- bu yuzden Gecmis
 * sekmesinden acilir, kendi ayri rotasindadir (`/insights`).
 *
 * Uretim ISTEGE BAGLI IPTAL EDILEBILIR (AbortController) ama bu SADECE istemcinin beklemeyi
 * birakmasidir: backend, odenen LLM cagrisini istemci koptugunda BILEREK durdurmaz
 * (`AiInsightService.GenerateAsync` saglayiciyi `CancellationToken.None` ile cagirir, odenen
 * bir yanit bosa gitmesin diye). Iptal sonrasi gosterilen mesaj bunu ACIKCA soyler -- "iptal
 * ettim, hicbir sey olmadi" izlenimi vermez, cunku bu YANLIS olabilir.
 *
 * AI kapaliyken (varsayilan saglayici `NullAiInsightProvider`) 503 doner -- bu bir HATA degil,
 * beklenen bir yapilandirma durumudur; ayri ve yumusak bir bilgi kutusuyla gosterilir, danger
 * renkli `HataKutusu` ile DEGIL.
 *
 * Maliyet bilgisi (TokensUsed/EstimatedCostUsd) BILEREK gosterilmez (Karar 4) -- `Yorum` tipi
 * zaten bu alanlari tasimiyor.
 */
export default function InsightsPage() {
  usePageTitle('AI yorumu');
  const [sayfa, setSayfa] = useState(1);
  const { data, isLoading, isError } = useInsights(sayfa);
  const uretMutasyonu = useGenerateInsight();
  const silMutasyonu = useDeleteInsight();

  const abortRef = useRef<AbortController | null>(null);
  const [durum, setDurum] = useState<'bos' | 'iptal-edildi' | 'bilgi' | 'hata'>('bos');
  const [bilgiMesaji, setBilgiMesaji] = useState<string | null>(null);
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [silinecekId, setSilinecekId] = useState<number | null>(null);

  function yorumIste() {
    setDurum('bos');
    setGenelHata(null);
    const controller = new AbortController();
    abortRef.current = controller;

    uretMutasyonu.mutate(controller.signal, {
      onError: (hata) => {
        // Kullanici zaten "Iptal et"e bastiysa asagidaki 'iptal-edildi' mesaji yeterli --
        // aninda gelen bir ikinci (hata) mesaji kafa karistirir.
        if (controller.signal.aborted) {
          return;
        }
        // 503 (AI kapali) ve 429 (haftalik sinir asildi, issue #76) BEKLENEN yapilandirma/kural
        // durumlaridir, "hata" DEGIL -- sunucunun kendi (429'da tarih iceren, DINAMIK) detay
        // metni oldugu gibi gosterilir, danger renkli HataKutusu ile DEGIL.
        if (hata instanceof ApiError && (hata.status === 503 || hata.status === 429)) {
          setBilgiMesaji(hata.detail);
          setDurum('bilgi');
          return;
        }
        setGenelHata(apiHatasiniAyir(hata, []).genelHata);
        setDurum('hata');
      },
    });
  }

  function iptalEt() {
    abortRef.current?.abort();
    setDurum('iptal-edildi');
  }

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      {/* Sekme cubugunda degil (SablonDuzenlePage'deki "Geri" desenin ayni) -- Gecmis'ten acilir. */}
      <Link to="/history" className="flex min-h-11 w-fit items-center gap-1 text-label text-muted">
        <ChevronLeft aria-hidden size={18} />
        Geçmiş
      </Link>

      <p className="text-body text-muted">
        Son 30 güne kadarki antrenman verini yapay zekaya yorumlatır. Belirli bir aralık seçmek
        şimdilik mümkün değil.
      </p>

      <div className="flex flex-col gap-3 rounded-xl bg-surface-1 p-4">
        {!uretMutasyonu.isPending && (
          <BirincilDugme yukseklik="normal" onClick={yorumIste}>
            <Sparkles aria-hidden size={20} />
            Yorum iste
          </BirincilDugme>
        )}

        {uretMutasyonu.isPending && (
          <div className="flex flex-col gap-3">
            <p role="status" className="text-body text-muted">
              Yorum hazırlanıyor... Bu birkaç dakika sürebilir.
            </p>
            <IkincilDugme onClick={iptalEt}>Vazgeç</IkincilDugme>
          </div>
        )}

        {durum === 'iptal-edildi' && (
          <p role="status" className="text-label text-muted">
            Beklemeyi durdurdun. Yorum yine de oluşturuluyor olabilir; birkaç dakika sonra
            listede görünebilir.
          </p>
        )}

        {durum === 'bilgi' && bilgiMesaji && (
          <p role="status" className="text-label text-muted">
            {bilgiMesaji}
          </p>
        )}

        {durum === 'hata' && genelHata && <HataKutusu baslik="Yorum alınamadı" mesaj={genelHata} />}
      </div>

      {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          Yorumlar alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <BosDurum ikon={Brain} baslik="Henüz yorum yok" aciklama="Yukarıdan ilk yorumunu iste." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {data.items.map((yorum) => (
              <YorumKarti
                key={yorum.id}
                yorum={yorum}
                onayAcik={silinecekId === yorum.id}
                onSilmeyeBasla={() => setSilinecekId(yorum.id)}
                onVazgec={() => setSilinecekId(null)}
                onSil={() => {
                  silMutasyonu.mutate(yorum.id);
                  setSilinecekId(null);
                }}
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
              Önceki
            </button>
            <span className="text-label tabular-nums">
              Sayfa {data.page} / {data.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setSayfa((s) => s + 1)}
              disabled={data.page >= data.totalPages}
              className={SAYFA_DUGMESI}
            >
              Sonraki
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface YorumKartiProps {
  yorum: Yorum;
  onayAcik: boolean;
  onSilmeyeBasla: () => void;
  onVazgec: () => void;
  onSil: () => void;
}

/**
 * Silme onaysiz yapilmaz (SablonDuzenlePage'deki desenin ayni) ama GECIKMELI/geri-alinabilir de
 * DEGILDIR -- bir yorumu yeniden "geri getirmek" anlamsizdir, yeniden uretmek FARKLI bir icerik
 * (ve yeni bir maliyet) uretir. Silme burada gercekten kalicidir, arayuz bunu gizlemez.
 */
function YorumKarti({ yorum, onayAcik, onSilmeyeBasla, onVazgec, onSil }: YorumKartiProps) {
  if (onayAcik) {
    return (
      <li className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <p className="text-body">Bu yorum kalıcı olarak silinecek.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSil}
            className="h-12 flex-1 rounded-xl bg-danger-bg text-label text-on-danger-bg"
          >
            Evet, sil
          </button>
          <div className="flex-1">
            <IkincilDugme onClick={onVazgec}>Vazgeç</IkincilDugme>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-label text-muted">
          {formatTrDate(yorum.createdAt)} {formatTrTime(yorum.createdAt)}
        </span>
        <IkonDugmesi etiket="Yorumu sil" onClick={onSilmeyeBasla}>
          <Trash2 aria-hidden size={18} />
        </IkonDugmesi>
      </div>
      <p className="whitespace-pre-wrap text-body">{yorum.content}</p>
    </li>
  );
}
