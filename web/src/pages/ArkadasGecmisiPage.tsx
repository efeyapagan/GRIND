import { useParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useArkadasGecmisi } from '../api/queries';
import { useSonsuzKaydirma } from '../lib/useSonsuzKaydirma';
import GecmisKarti from '../components/GecmisKarti';
import BosDurum from '../ui/BosDurum';

/**
 * Arkadaşın geçmişi (#282/#284): kendi Geçmiş'inle aynı kart, salt-okunur (`onSil` yok). Yalnızca
 * `KullaniciProfiliPage` arkadaş olduğunu gördükten sonra çizilir; sıra ve toplamlar sunucunun.
 */
export default function ArkadasGecmisiPage() {
  const { t } = useTranslation();
  const { username: ad = '' } = useParams();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useArkadasGecmisi(ad, true);
  const sentinelRef = useSonsuzKaydirma(hasNextPage, fetchNextPage);
  const oturumlar = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      {isLoading && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}
      {isError && (
        <p role="alert" className="text-body text-danger">
          {t('takip.arkadasGecmisiAlinamadi')}
        </p>
      )}
      {data && oturumlar.length === 0 && <BosDurum ikon={CalendarDays} baslik={t('gecmis.bosBaslik')} />}
      {oturumlar.length > 0 && (
        <>
          <ul className="flex flex-col gap-4">
            {oturumlar.map((oturum) => (
              <GecmisKarti key={oturum.sessionId} oturum={oturum} />
            ))}
          </ul>
          <div ref={sentinelRef} aria-hidden className="h-px" />
          {isFetchingNextPage && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}
        </>
      )}
    </div>
  );
}
