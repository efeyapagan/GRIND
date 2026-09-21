import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import IkonDugmesi from '../ui/IkonDugmesi';
import { tercihiDegistir } from '../lib/tema';
import { useEtkinTema } from '../lib/useEtkinTema';

/**
 * Ust kabuktaki tema dugmesi (#194): iki durumlu, her dokunus etkin temanin tersini secer. Ikon
 * basinca olacak seyi gosterir (koyuda gunes, acikta ay). Hic dokunulmadiysa tercih "sistem" kalir
 * ve ekran isletim sistemini izler; ilk dokunustan sonra secim kalicidir (acik-tema spec Karar 4).
 */
export default function TemaDugmesi() {
  const { t } = useTranslation();
  const hedef = useEtkinTema() === 'acik' ? 'koyu' : 'acik';

  return (
    <IkonDugmesi
      etiket={hedef === 'acik' ? t('kabuk.acikTemayaGec') : t('kabuk.koyuTemayaGec')}
      onClick={() => tercihiDegistir(hedef)}
    >
      {hedef === 'acik' ? <Sun aria-hidden size={20} /> : <Moon aria-hidden size={20} />}
    </IkonDugmesi>
  );
}
