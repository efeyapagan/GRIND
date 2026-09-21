import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTemplates } from '../api/queries';
import { usePageTitle } from '../ui/PageTitleContext';
import BosDurum from '../ui/BosDurum';
import BirincilDugme from '../ui/BirincilDugme';
import SablonKarti from '../ui/SablonKarti';

/**
 * Sablon listesi (spec Karar 3). Sekme degil: hesap menusunden ve Bugun'un bos durumundan acilir
 * (Karar 2). Hata durumu bos durumdan AYRI ve ONCELIKLI gosterilir. Baslik ust kabukta (issue #65).
 */
export default function SablonlarPage() {
  const { t } = useTranslation();
  usePageTitle(t('sablonlar.baslik'));
  const navigate = useNavigate();
  const { data: sablonlar, isLoading, isError } = useTemplates();

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      {isLoading && <p className="text-body text-muted">{t('ortak.yukleniyor')}</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          {t('sablonlar.hataYenile')}
        </p>
      )}

      {sablonlar && sablonlar.length === 0 && (
        <BosDurum
          ikon={ClipboardList}
          baslik={t('sablonlar.hicSablonYokBaslik')}
          aciklama={t('sablonlar.hicSablonYokAciklama')}
        />
      )}

      {sablonlar && sablonlar.length > 0 && (
        <ul className="flex flex-col gap-3">
          {sablonlar.map((sablon) => (
            <li key={sablon.id}>
              <SablonKarti ad={sablon.name} hareketSayisi={sablon.exercises.length} to={`/templates/${sablon.id}`} />
            </li>
          ))}
        </ul>
      )}

      <BirincilDugme yukseklik="normal" onClick={() => navigate('/templates/new')}>
        <Plus aria-hidden size={20} />
        {t('sablonlar.yeniSablon')}
      </BirincilDugme>
    </div>
  );
}
