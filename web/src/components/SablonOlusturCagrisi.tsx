import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
 * #93: eskiden AddSetForm gibi ekranin altina yapisikti (sticky, issue #61 Karar 2); Bugun Takvimle bir ana
 * sayfaya donunce sayfa en ustteyken de gorunup "Şablonla başla" kartlarini ortuyordu. Artik sayfanin
 * AKISINDA, sablon listesinin altinda durur -- asagi kaydirinca gorunur. Acik antrenmandaki AddSetForm
 * yapisik kalir.
 */
export default function SablonOlusturCagrisi() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="pb-2">
      <BirincilDugme yukseklik="normal" onClick={() => navigate('/templates/new', { state: { donus: '/' } })}>
        <Plus aria-hidden size={20} />
        {t('sablonlar.olustur')}
      </BirincilDugme>
    </div>
  );
}
