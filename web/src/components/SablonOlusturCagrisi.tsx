import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import BirincilDugme from '../ui/BirincilDugme';

/**
 * Bugun'un alt alani, ACIK ANTRENMAN YOKKEN (issue #61). "+ Set ekle"nin yerini alir: serbest
 * (sablonsuz) antrenman artik arayuzden baslatilamaz -- her antrenman bir sablonla baslar.
 * Backend'e dokunulmadi: `POST /api/sets`in oturumu kendiliginden acmasi API'de duruyor, arayuz
 * artik onu KULLANMIYOR.
 *
 * `/templates/new`'e `donus: '/'` state'iyle gider: sablon BURADAN olusturulduysa kaydedince
 * Bugun'e donulur (bkz. SablonDuzenlePage). Sablonlar ekranindaki "Yeni sablon" dugmesi ayni
 * hedefe state VERMEDEN gider, o yuzden kendi varsayilan davranisini (/templates'e donmeyi) korur
 * -- SablonlarPage'deki "Yeni sablon" ile AYNI desen (BirincilDugme + onClick + navigate).
 *
 * AddSetForm ile ayni sticky konumlama ve dis kutu (App.tsx h-16 sekme cubugu ustunde) -- "ayni
 * yerde, ayni gorunumde" (issue #61 Karar 2).
 */
export default function SablonOlusturCagrisi() {
  const navigate = useNavigate();

  return (
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 mt-auto pb-2">
      <div className="mx-auto max-w-md rounded-xl bg-surface-3 p-3 shadow-2xl">
        <BirincilDugme
          yukseklik="normal"
          onClick={() => navigate('/templates/new', { state: { donus: '/' } })}
        >
          <Plus aria-hidden size={20} />
          Şablon oluştur
        </BirincilDugme>
      </div>
    </div>
  );
}
