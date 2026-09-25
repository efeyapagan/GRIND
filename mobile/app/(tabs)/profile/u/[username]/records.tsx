import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useArkadasRekorlari } from '@grind/shared/api/queries';
import RekorKarti from '../../../../../src/components/RekorKarti';
import BosDurum from '../../../../../src/ui/BosDurum';
import { useAltMenuPayi } from '../../../../../src/ui/KabukTabBar';

/**
 * web/src/pages/ArkadasRekorlariPage.tsx ile ayni (#282/#284): kendi Rekorlar'inla ayni kart; seri ve
 * plato arkadasla paylasilmaz, cizilmez.
 */
export default function ArkadasRekorlariScreen() {
  const altMenuPayi = useAltMenuPayi();
  const { t } = useTranslation();
  const { username: ad = '' } = useLocalSearchParams<{ username: string }>();
  const { data, isLoading, isError } = useArkadasRekorlari(ad, true);

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('takip.arkadasRekorlariAlinamadi')}
        </Text>
      )}
      {data && data.length === 0 && <BosDurum ikon={Trophy} baslik={t('rekorlar.bosBaslik')} />}
      {data && data.length > 0 && (
        <View className="flex-col gap-4">
          {data.map((rekor) => (
            <RekorKarti key={rekor.exerciseId} rekor={rekor} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
