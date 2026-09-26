import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { useTemplate } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import SablonFormu from '../../../src/components/SablonFormu';
import EkranKaydirici from '../../../src/ui/EkranKaydirici';

/**
 * web/src/pages/SablonDuzenlePage.tsx (`/templates/:id` dali) ile ayni. Geri baglantisi artik
 * ust kabukta (issue #255, `altEkranMi`) -- burada ayrica bir tane yazilmaz.
 */
export default function SablonDuzenleScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sablonId = Number(id);
  const { data: sablon, isLoading, isError } = useTemplate(sablonId);
  usePageTitle(t('sablonlar.duzenleBaslik'));

  if (isLoading) {
    return (
      <EkranKaydirici contentContainerClassName="gap-5 px-4 pt-2 pb-4">
        <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>
      </EkranKaydirici>
    );
  }

  if (isError || !sablon) {
    return (
      <EkranKaydirici contentContainerClassName="gap-5 px-4 pt-2 pb-4">
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('sablonlar.tekilHata')}
        </Text>
      </EkranKaydirici>
    );
  }

  return (
    <EkranKaydirici contentContainerClassName="gap-5 px-4 pt-2 pb-4">
      <SablonFormu key={sablon.id} sablon={sablon} donusYolu="/templates" />
    </EkranKaydirici>
  );
}
