import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Dumbbell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSharedTemplates } from '@grind/shared/api/queries';
import { sablonOzeti } from '@grind/shared/lib/sablonOzeti';
import BosDurum from '../../../../../src/ui/BosDurum';
import { useAltMenuPayi } from '../../../../../src/ui/KabukTabBar';
import PaylasilanSablonSatiri from '../../../../../src/components/PaylasilanSablonSatiri';

/**
 * #467: arkadaşın paylaştığı şablonlar -- sadece arkadaşsan bu ekrana yönlendirilir (bkz.
 * `_layout.tsx`'teki koşullu sekme). Kendi Rekorlar/Geçmiş ekranlarıyla ayni bos durum deseni.
 */
export default function PaylasilanSablonlarScreen() {
  const altMenuPayi = useAltMenuPayi();
  const { t } = useTranslation();
  const { username: ad = '' } = useLocalSearchParams<{ username: string }>();
  const { data, isLoading, isError } = useSharedTemplates(ad);

  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('sablonlar.arkadasSablonlariAlinamadi')}
        </Text>
      )}
      {data && data.length === 0 && <BosDurum ikon={Dumbbell} baslik={t('sablonlar.arkadasSablonuYok')} />}
      {data && data.length > 0 && (
        <View className="flex-col gap-3">
          {data.map((sablon) => (
            <PaylasilanSablonSatiri key={sablon.id} kullaniciAdi={ad} sablon={sablon} ozet={sablonOzeti(sablon)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
