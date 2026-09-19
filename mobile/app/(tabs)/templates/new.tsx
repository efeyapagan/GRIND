import { Text } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { usePageTitle } from '@grind/shared/pageTitle';
import SablonFormu from '../../../src/components/SablonFormu';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';
import { ikonRenk } from '../../../src/ui/renkler';

/** web/src/pages/SablonDuzenlePage.tsx (`sablon === null` dali) ile ayni. */
export default function YeniSablonScreen() {
  usePageTitle('Yeni şablon');
  const { donus } = useLocalSearchParams<{ donus?: string }>();

  return (
    <EkranKaydirici contentContainerClassName="gap-5 px-4 pt-2 pb-4">
      <Link href="/templates" className="min-h-11 flex-row items-center gap-1">
        <ChevronLeft color={ikonRenk.muted} size={18} />
        <Text className="text-label text-muted">Şablonlar</Text>
      </Link>
      <SablonFormu sablon={null} donusYolu={donus ?? '/templates'} />
    </EkranKaydirici>
  );
}
