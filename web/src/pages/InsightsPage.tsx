import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ChevronLeft, Sparkles, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDil } from '@grind/shared/i18n';
import {
  useDeleteInsight,
  useGenerateInsight,
  useInfiniteInsights,
  useInsightGenerationState,
  type Yorum,
} from '../api/queries';
import { ApiError } from '../api/problem';
import { apiHatasiniAyir } from '../lib/apiErrors';
import { formatSaat, formatTarih } from '../lib/format';
import { usePageTitle } from '../ui/PageTitleContext';
import BirincilDugme from '../ui/BirincilDugme';
import IkincilDugme from '../ui/IkincilDugme';
import IkonDugmesi from '../ui/IkonDugmesi';
import BosDurum from '../ui/BosDurum';
import HataKutusu from '../ui/HataKutusu';

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
  const { t } = useTranslation();
  usePageTitle(t('yorumlar.baslik'));
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteInsights();
  const uretMutasyonu = useGenerateInsight();
  // Issue #148: "uretiliyor mu" bilgisi bu bilesenin mutation'indan DEGIL, mount'tan bagimsiz
  // yasayan MutationCache'ten okunur -- sayfadan cikip donuldugunde gosterge kaybolmasin.
  const { uretiliyor, iptalEt: uretimiIptalEt } = useInsightGenerationState();
  const silMutasyonu = useDeleteInsight();

  const [durum, setDurum] = useState<'bos' | 'iptal-edildi' | 'bilgi' | 'hata'>('bos');
  const [bilgiMesaji, setBilgiMesaji] = useState<string | null>(null);
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [silinecekId, setSilinecekId] = useState<number | null>(null);

  function yorumIste() {
    setDurum('bos');
    setGenelHata(null);
    const controller = new AbortController();

    uretMutasyonu.mutate(controller, {
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
    uretimiIptalEt();
    setDurum('iptal-edildi');
  }

  const tumYorumlar = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];

  // Liste sonundaki gorunmez oge viewport'a girince bir sonraki sayfa cekilir (issue #147,
  // HistoryPage ile ayni desen). `hasNextPage` false iken gozlemci hic KURULMAZ.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) {
      return;
    }
    const gozlemci = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    gozlemci.observe(sentinel);
    return () => gozlemci.disconnect();
  }, [hasNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      {/* Sekme cubugunda degil (SablonDuzenlePage'deki "Geri" desenin ayni) -- Gecmis'ten acilir. */}
      <Link to="/history" className="flex min-h-11 w-fit items-center gap-1 text-label text-muted">
        <ChevronLeft aria-hidden size={18} />
        {t('kabuk.sekmeGecmis')}
      </Link>

      <p className="text-body text-muted">{t('yorumlar.aciklama')}</p>

      <div className="flex flex-col gap-3 rounded-xl bg-surface-1 p-4">
        {!uretiliyor && (
          <BirincilDugme yukseklik="normal" onClick={yorumIste}>
            <Sparkles aria-hidden size={20} />
            {t('yorumlar.yorumIste')}
          </BirincilDugme>
        )}

        {uretiliyor && (
          <div className="flex flex-col gap-3">
            <p role="status" className="text-body text-muted">
              {t('yorumlar.hazirlaniyor')}
            </p>
            <IkincilDugme onClick={iptalEt}>{t('ortak.vazgec')}</IkincilDugme>
          </div>
        )}

        {durum === 'iptal-edildi' && (
          <p role="status" className="text-label text-muted">
            {t('yorumlar.iptalEdildi')}
          </p>
        )}

        {durum === 'bilgi' && bilgiMesaji && (
          <p role="status" className="text-label text-muted">
            {bilgiMesaji}
          </p>
        )}

        {durum === 'hata' && genelHata && <HataKutusu baslik={t('yorumlar.alinamadi')} mesaj={genelHata} />}
      </div>

      {isLoading && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          {t('yorumlar.hata')}
        </p>
      )}

      {!isLoading && !isError && data && tumYorumlar.length === 0 && (
        <BosDurum ikon={Brain} baslik={t('yorumlar.bosBaslik')} aciklama={t('yorumlar.bosAciklama')} />
      )}

      {!isLoading && !isError && data && tumYorumlar.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {tumYorumlar.map((yorum) => (
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
          {/* Gorunmez sentinel: `<ul>`in DISINDA, `listitem` sayisini etkilemesin diye. */}
          <div ref={sentinelRef} aria-hidden className="h-px" />
          {isFetchingNextPage && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}
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
  const { t } = useTranslation();
  const dil = useDil();
  if (onayAcik) {
    return (
      <li className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <p className="text-body">{t('yorumlar.silmeOnayi')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSil}
            className="h-12 flex-1 rounded-xl bg-danger-bg text-label text-on-danger-bg"
          >
            {t('sablonlar.evetSil')}
          </button>
          <div className="flex-1">
            <IkincilDugme onClick={onVazgec}>{t('ortak.vazgec')}</IkincilDugme>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-label text-muted">
          {formatTarih(yorum.createdAt, dil)} {formatSaat(yorum.createdAt)}
        </span>
        <IkonDugmesi etiket={t('yorumlar.yorumuSil')} onClick={onSilmeyeBasla}>
          <Trash2 aria-hidden size={18} />
        </IkonDugmesi>
      </div>
      <p className="whitespace-pre-wrap text-body">{yorum.content}</p>
    </li>
  );
}
