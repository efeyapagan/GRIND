import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { useTemplates } from '../api/queries';
import BosDurum from '../ui/BosDurum';
import BirincilDugme from '../ui/BirincilDugme';
import SablonKarti from '../ui/SablonKarti';

/**
 * Sablon listesi (spec Karar 3). Sekme degil: hesap menusunden ve Bugun'un bos durumundan acilir
 * (Karar 2). Hata durumu bos durumdan AYRI ve ONCELIKLI gosterilir.
 */
export default function SablonlarPage() {
  const navigate = useNavigate();
  const { data: sablonlar, isLoading, isError } = useTemplates();

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4">
      <h1 className="text-title">Şablonlar</h1>

      {isLoading && <p className="text-body text-muted">Yükleniyor...</p>}

      {isError && (
        <p role="alert" className="text-body text-danger">
          Şablonlar alınamadı. Lütfen sayfayı yenileyin.
        </p>
      )}

      {sablonlar && sablonlar.length === 0 && (
        <BosDurum
          ikon={ClipboardList}
          baslik="Henüz şablon yok"
          aciklama="Bir gün tipinin hareketlerini bir kez kur, antrenmanı tek dokunuşla başlat."
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
        Yeni şablon
      </BirincilDugme>
    </div>
  );
}
