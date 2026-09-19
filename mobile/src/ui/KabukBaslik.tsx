import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderTitle } from '@grind/shared/pageTitle';

/**
 * App.tsx'teki `<header>`in RN karsiligi: solda o an aktif ekranin basligi, sagda "GRIND".
 * Baslik `usePageTitle` ile PageTitleProvider'a bildirilir (@grind/shared/pageTitle) -- her
 * ekran kendi govdesinde ayrica bir baslik yazmaz (web ile ayni tek dogruluk kaynagi).
 */
export default function KabukBaslik() {
  const baslik = useHeaderTitle();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }} className="bg-bg">
      <View className="h-16 flex-row items-center justify-between px-4">
        <Text numberOfLines={1} className="flex-1 text-heading text-fg">
          {baslik}
        </Text>
        <Text className="shrink-0 text-label text-muted uppercase">GRIND</Text>
      </View>
    </View>
  );
}
