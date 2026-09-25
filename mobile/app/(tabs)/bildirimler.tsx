import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react-native';
import { usePageTitle } from '@grind/shared/pageTitle';
import BosDurum from '../../src/ui/BosDurum';

/**
 * Ana sayfanin sag ustundeki zilin actigi ekran (#324). Bildirim ozelligi henuz yok (veri ve backend
 * #325'te) -- simdilik yalnizca bos durum. Geri dugmesi kabuktan gelir (`altEkranMi`).
 */
export default function BildirimlerScreen() {
  const { t } = useTranslation();
  usePageTitle(t('ortak.bildirimler'));

  return (
    <ScrollView contentContainerClassName="px-4 pt-2 pb-4">
      <BosDurum ikon={Bell} baslik={t('bildirimler.bos')} aciklama={t('bildirimler.bosAciklama')} />
    </ScrollView>
  );
}
