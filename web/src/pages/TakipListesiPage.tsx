import { useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTakipListesi, type TakipListesiTuru } from '../api/queries';
import { useSonsuzKaydirma } from '../lib/useSonsuzKaydirma';
import { usePageTitle } from '../ui/PageTitleContext';
import BosDurum from '../ui/BosDurum';
import KullaniciSatiri from '../components/KullaniciSatiri';

const METINLER = {
  friends: { baslik: 'profil.arkadaslar', bos: 'takip.arkadasYok' },
  followers: { baslik: 'profil.takipciler', bos: 'takip.takipciYok' },
  following: { baslik: 'profil.takipEdilenler', bos: 'takip.takipEdilenYok' },
} as const;

/**
 * Arkadaşlar / Takipçiler / Takip edilenler (#284) -- profil başlığındaki sayaçların açtığı liste.
 * Satırdaki düğme BAKANIN ilişkisidir (sunucu); sıra ve içerik sunucunun, sonsuz kaydırmalı.
 */
export default function TakipListesiPage({ liste }: { liste: TakipListesiTuru }) {
  const { t } = useTranslation();
  const { username: ad = '' } = useParams();
  usePageTitle(t(METINLER[liste].baslik));
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useTakipListesi(ad, liste);
  const sentinelRef = useSonsuzKaydirma(hasNextPage, fetchNextPage);
  const kisiler = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];

  return (
    <div className="flex flex-col gap-4 pt-2 pb-4">
      {isLoading && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}
      {isError && (
        <p role="alert" className="text-body text-danger">
          {t('takip.listeAlinamadi')}
        </p>
      )}
      {data && kisiler.length === 0 && <BosDurum ikon={Users} baslik={t(METINLER[liste].bos)} />}
      {kisiler.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {kisiler.map((kisi) => (
              <KullaniciSatiri key={kisi.username} kisi={kisi} />
            ))}
          </ul>
          <div ref={sentinelRef} aria-hidden className="h-px" />
          {isFetchingNextPage && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}
        </>
      )}
    </div>
  );
}
