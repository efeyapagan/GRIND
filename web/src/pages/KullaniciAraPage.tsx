import { useEffect, useState } from 'react';
import { Search, UserRoundSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ARAMA_GECIKMESI_MS } from '@grind/shared/lib/takip';
import { useKullaniciAra } from '../api/queries';
import { usePageTitle } from '../ui/PageTitleContext';
import Alan from '../ui/Alan';
import BosDurum from '../ui/BosDurum';
import KullaniciSatiri from '../components/KullaniciSatiri';

/**
 * Kullanıcı arama (#284): kullanıcı adının ya da görünen ismin bir kelimesinin başıyla, sunucuda; her
 * tuşta değil, yazma durunca. Sonuç satırları takip listeleriyle aynıdır ve profile götürür.
 */
export default function KullaniciAraPage() {
  const { t } = useTranslation();
  usePageTitle(t('takip.kullaniciAra'));
  const [yazilan, setYazilan] = useState('');
  const [sorgu, setSorgu] = useState('');
  useEffect(() => {
    const zamanlayici = setTimeout(() => setSorgu(yazilan.trim()), ARAMA_GECIKMESI_MS);
    return () => clearTimeout(zamanlayici);
  }, [yazilan]);
  const { data, isError } = useKullaniciAra(sorgu);

  return (
    <div className="flex flex-col gap-4 pt-2 pb-4">
      <Alan
        id="kullanici-ara"
        type="search"
        etiket={t('takip.kullaniciAra')}
        ikon={Search}
        placeholder={t('takip.aramaIpucu')}
        autoComplete="off"
        autoFocus
        value={yazilan}
        onChange={(e) => setYazilan(e.target.value)}
      />
      {isError && (
        <p role="alert" className="text-body text-danger">
          {t('takip.aramaYapilamadi')}
        </p>
      )}
      {sorgu && data && data.length === 0 && (
        <BosDurum ikon={UserRoundSearch} baslik={t('takip.kullaniciBulunamadi')} />
      )}
      {sorgu && data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((kisi) => (
            <KullaniciSatiri key={kisi.username} kisi={kisi} />
          ))}
        </ul>
      )}
    </div>
  );
}
