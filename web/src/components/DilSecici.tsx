import { useTranslation } from 'react-i18next';
import { useDil, type Dil } from '@grind/shared/i18n';
import SecimKutusu from '../ui/SecimKutusu';
import { diliDegistir } from '../lib/dil';

/** Profil'deki dil secimi (#177). Secim hemen uygulanir ve cihazda saklanir. */
export default function DilSecici() {
  const { t } = useTranslation();
  const dil = useDil();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="dil-secimi" className="text-label text-muted">
        {t('dil.etiket')}
      </label>
      <SecimKutusu id="dil-secimi" value={dil} onChange={(olay) => diliDegistir(olay.target.value as Dil)}>
        <option value="tr">{t('dil.turkce')}</option>
        <option value="en">{t('dil.ingilizce')}</option>
      </SecimKutusu>
    </div>
  );
}
