import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Brain, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { oturumSilindiTazele, oturumuSil, useInfiniteHistory, type GecmisOturum } from '../api/queries';
import { GERI_AL_MS, useGecikmeliSilme } from '../lib/gecikmeliSilme';
import { sallamaIzniIste, useSallama } from '../lib/sallama';
import GecmisKarti from '../components/GecmisKarti';
import BosDurum from '../ui/BosDurum';
import GeriAlSeridi from '../ui/GeriAlSeridi';
import { usePageTitle } from '../ui/PageTitleContext';

/**
 * "Gecmis" ekrani -- sunucunun sayfali zarfini oldugu gibi gosterir. Sira, toplam sayi ve hacim
 * TAMAMEN sunucudan gelir (spec); istemci hicbir seyi yeniden HESAPLAMAZ veya SIRALAMAZ. Hata
 * durumu bos durumdan AYRI ve ONCELIKLI gosterilir.
 *
 * Sayfalama Onceki/Sonraki dugmeleri yerine SONSUZ KAYDIRMA'dir (issue #138): listenin sonundaki
 * gorunmez `sentinelRef` ogesi viewport'a girince (`IntersectionObserver`) bir sonraki 25'lik
 * sayfa otomatik cekilir; sayfalar TanStack Query'nin kendi `pages` dizisinde birikir, istemci
 * ayri bir "biriktirilmis liste" state'i TUTMAZ.
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
  const { t } = useTranslation();
  usePageTitle(t('kabuk.sekmeGecmis'));
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteHistory();
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

  // Sunucudan gelen TUM sayfalarin oturumlari BIRLIKTE, sunucu sirasiyla (spec: istemci yeniden
  // SIRALAMAZ) -- `pages` TanStack Query'nin kendi biriktirdigi dizidir, burada ayrica bir state
  // tutulmaz. Bekleyen silme listeden hemen kalkar; geri alinirsa sunucudan silinmedigi icin
  // oldugu gibi doner.
  const tumOturumlar = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];
  const gorunenler = tumOturumlar.filter((o) => o.sessionId !== bekleyen?.sessionId);

  // Liste sonundaki gorunmez oge viewport'a girince bir sonraki sayfa cekilir. `hasNextPage`
  // false iken gozlemci hic KURULMAZ -- son sayfadayken bos yere bir IntersectionObserver
  // ayakta tutulmaz (ikinci test: "son sayfadaysa ... yeni istek atilmaz").
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
      {/* Issue #76: POST /api/insights bir oturuma degil TARIH ARALIGINA gore calisir -- bu
          yuzden bir sablon/hesap ayari degil, Gecmis'in kendi bir uzantisidir. Tam genislikte,
          IkincilDugme ile AYNI sinif kumesi (o bir <button>, bu bir <Link> oldugu icin dogrudan
          bilesen kullanilamiyor -- gorunum birebir kopyalanir). */}
      <Link
        to="/insights"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-3 px-4 text-label text-fg"
      >
        <Brain aria-hidden size={18} />
        {t('yorumlar.baslik')}
      </Link>

      {isLoading && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          {t('gecmis.hata')}
        </p>
      )}

      {!isLoading && !isError && data && gorunenler.length === 0 && (
        <BosDurum ikon={CalendarDays} baslik={t('gecmis.bosBaslik')} />
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
          {/* Gorunmez sentinel: listenin sonuna gelinince (`IntersectionObserver`) bir sonraki
              sayfa otomatik cekilir -- `<ul>`in DISINDA, `listitem` sayisini etkilemesin diye. */}
          <div ref={sentinelRef} aria-hidden className="h-px" />
          {isFetchingNextPage && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}
        </>
      )}

      {bekleyen && (
        <GeriAlSeridi
          // `key`: ard arda iki silmede serit YENIDEN monte olsun, pencere bastan baslasin.
          key={bekleyen.sessionId}
          mesaj={t('gecmis.silindi')}
          sureMs={GERI_AL_MS}
          onGeriAl={geriAl}
          onSureDoldu={sureDoldu}
        />
      )}
    </div>
  );
}
