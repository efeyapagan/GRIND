import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGuncelTakvimOzeti, usePlatolar, useRecords } from '../api/queries';
import { usePageTitle } from '../ui/PageTitleContext';
import BosDurum from '../ui/BosDurum';
import RekorKarti from '../components/RekorKarti';

/**
 * "Rekorlar" ekrani -- her egzersiz icin en agir seti ve en cok tekrari AYRI AYRI gosterir
 * (spec): bunlar cogu zaman farkli setlerdir. Sunucunun dondugu degerler oldugu gibi gosterilir,
 * istemci hicbir rekoru YENIDEN HESAPLAMAZ. Kartlar etkilesimsizdir.
 *
 * Baslik artik ust kabukta (issue #65) -- `usePageTitle` ile bildirilir, burada ayrica bir
 * `<h1>` YAZILMAZ. Alt aciklama ("Kişisel en iyiler") baslik degil, kalir. #293: Profil'in kendi
 * sekmelerinde (Gecmis/Rekorlar/Olculer) ust basliktaki metin tamamen kalkti -- profil basligi
 * (foto, isim) zaten hemen ustte, ayrica bir sekme adi gostermeye gerek yok. Bos gonderilen
 * `usePageTitle('')` bir onceki sayfadan kalan basligi TEMIZLER (aksi halde context state'i
 * degismeden kalirdi).
 */
export default function RecordsPage() {
  const { t } = useTranslation();
  usePageTitle('');
  const { data, isLoading, isError } = useRecords();
  // #117: en uzun seri Bugun'den buraya tasindi; tum gecmisten, sunucunun degeri.
  const { data: takvimOzeti } = useGuncelTakvimOzeti();
  // #72: platodaki kartlara rozet. Sorgu dusse de rekorlar gosterilir -- rozet yalnizca eksik kalir.
  const { data: platolar } = usePlatolar();
  const platoOf = new Map(platolar?.map((p) => [p.exerciseId, p]));

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      <p className="text-body text-muted">{t('rekorlar.altBaslik')}</p>

      {takvimOzeti && (
        <dl className="rounded-xl bg-surface-2 p-4">
          <div className="flex flex-col gap-1">
            <dt className="text-label text-muted">{t('rekorlar.enUzunSeri')}</dt>
            <dd className="text-metric tabular-nums">
              {t('takvim.haftaSayisi', { count: takvimOzeti.longestWeekStreak })}
            </dd>
          </div>
        </dl>
      )}

      {isLoading && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          {t('rekorlar.hata')}
        </p>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <BosDurum ikon={Trophy} baslik={t('rekorlar.bosBaslik')} />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <ul className="flex flex-col gap-4">
          {data.map((rekor) => (
            <RekorKarti key={rekor.exerciseId} rekor={rekor} plato={platoOf.get(rekor.exerciseId)} />
          ))}
        </ul>
      )}
    </div>
  );
}
