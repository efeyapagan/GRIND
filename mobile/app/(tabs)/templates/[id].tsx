import { Text } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTemplate } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import SablonFormu from '../../../src/components/SablonFormu';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';
import { ikonRenk } from '../../../src/ui/renkler';

function GeriBaglantisi() {
  return (
    <Link href="/templates" className="min-h-11 flex-row items-center gap-1">
      <ChevronLeft color={ikonRenk.muted} size={18} />
      <Text className="text-label text-muted">Şablonlar</Text>
    </Link>
  );
}

/** web/src/pages/SablonDuzenlePage.tsx (`/templates/:id` dali) ile ayni. */
export default function SablonDuzenleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sablonId = Number(id);
  const { data: sablon, isLoading, isError } = useTemplate(sablonId);
  usePageTitle('Şablonu düzenle');

  if (isLoading) {
    return (
      <EkranKaydirici contentContainerClassName="gap-5 px-4 pt-2 pb-4">
        <GeriBaglantisi />
        <Text className="text-body text-muted">Yükleniyor...</Text>
      </EkranKaydirici>
    );
  }

  if (isError || !sablon) {
    return (
      <EkranKaydirici contentContainerClassName="gap-5 px-4 pt-2 pb-4">
        <GeriBaglantisi />
        <Text accessibilityRole="alert" className="text-body text-danger">
          Şablon alınamadı.
        </Text>
      </EkranKaydirici>
    );
  }

  return (
    <EkranKaydirici contentContainerClassName="gap-5 px-4 pt-2 pb-4">
      <GeriBaglantisi />
      <SablonFormu key={sablon.id} sablon={sablon} donusYolu="/templates" />
    </EkranKaydirici>
  );
}
