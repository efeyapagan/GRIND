import { useParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useArkadasRekorlari } from '../api/queries';
import RekorKarti from '../components/RekorKarti';
import BosDurum from '../ui/BosDurum';

/**
 * Arkadaşın tüm zamanların rekorları (#282/#284): kendi Rekorlar'ınla aynı kart. Seri ve plato
 * arkadaşla paylaşılmaz (#282 yalnızca `/records`'u açar), bu yüzden çizilmez.
 */
export default function ArkadasRekorlariPage() {
  const { t } = useTranslation();
  const { username: ad = '' } = useParams();
  const { data, isLoading, isError } = useArkadasRekorlari(ad, true);

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      {isLoading && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}
      {isError && (
        <p role="alert" className="text-body text-danger">
          {t('takip.arkadasRekorlariAlinamadi')}
        </p>
      )}
      {data && data.length === 0 && <BosDurum ikon={Trophy} baslik={t('rekorlar.bosBaslik')} />}
      {data && data.length > 0 && (
        <ul className="flex flex-col gap-4">
          {data.map((rekor) => (
            <RekorKarti key={rekor.exerciseId} rekor={rekor} />
          ))}
        </ul>
      )}
    </div>
  );
}
