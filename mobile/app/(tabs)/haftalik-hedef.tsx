import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@grind/shared/pageTitle';
import HaftalikHedefFormu from '../../src/components/HaftalikHedefFormu';

/** Haftalik hedef ekrani (#324): ana sayfadaki kart ve hesap ayarlari buraya gelir. Geri dugmesi kabuktan. */
export default function HaftalikHedefScreen() {
  const { t } = useTranslation();
  usePageTitle(t('profil.haftalikHedef'));

  return <HaftalikHedefFormu />;
}
