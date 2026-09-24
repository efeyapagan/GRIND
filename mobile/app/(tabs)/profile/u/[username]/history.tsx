import { FlatList, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useArkadasGecmisi } from '@grind/shared/api/queries';
import GecmisKarti from '../../../../../src/components/GecmisKarti';
import BosDurum from '../../../../../src/ui/BosDurum';

/**
 * web/src/pages/ArkadasGecmisiPage.tsx ile ayni (#282/#284): kendi Gecmis'inle ayni kart, salt-okunur
 * (`onSil` yok). Yalnizca ust duzen arkadas oldugunu gordukten sonra cizilir.
 */
export default function ArkadasGecmisiScreen() {
  const { t } = useTranslation();
  const { username: ad = '' } = useLocalSearchParams<{ username: string }>();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useArkadasGecmisi(ad, true);
  const oturumlar = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];

  return (
    <FlatList
      data={oturumlar}
      keyExtractor={(oturum) => String(oturum.sessionId)}
      renderItem={({ item }) => <GecmisKarti oturum={item} />}
      ItemSeparatorComponent={() => <View className="h-4" />}
      contentContainerClassName="px-4 pt-2 pb-4"
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      }}
      ListHeaderComponent={
        <>
          {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
          {isError && (
            <Text accessibilityRole="alert" className="text-body text-danger">
              {t('takip.arkadasGecmisiAlinamadi')}
            </Text>
          )}
        </>
      }
      ListEmptyComponent={data ? <BosDurum ikon={CalendarDays} baslik={t('gecmis.bosBaslik')} /> : null}
      ListFooterComponent={
        isFetchingNextPage ? <Text className="mt-4 text-body text-muted">{t('ortak.yukleniyor')}</Text> : null
      }
    />
  );
}
