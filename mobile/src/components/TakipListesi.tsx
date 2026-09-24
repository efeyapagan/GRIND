import { FlatList, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTakipListesi, type TakipListesiTuru } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import BosDurum from '../ui/BosDurum';
import KullaniciSatiri from './KullaniciSatiri';

const METINLER = {
  friends: { baslik: 'profil.arkadaslar', bos: 'takip.arkadasYok' },
  followers: { baslik: 'profil.takipciler', bos: 'takip.takipciYok' },
  following: { baslik: 'profil.takipEdilenler', bos: 'takip.takipEdilenYok' },
} as const;

/**
 * web/src/pages/TakipListesiPage.tsx ile ayni (#284). Uc rota dosyasi (`friends`/`followers`/`following`)
 * bu tek ekrani `liste` ile cizer; sonsuz kaydirma Gecmis'teki gibi `onEndReached`.
 */
export default function TakipListesi({ liste }: { liste: TakipListesiTuru }) {
  const { t } = useTranslation();
  const { username: ad = '' } = useLocalSearchParams<{ username: string }>();
  usePageTitle(t(METINLER[liste].baslik));
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useTakipListesi(ad, liste);
  const kisiler = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];

  return (
    <FlatList
      data={kisiler}
      keyExtractor={(kisi) => kisi.username}
      renderItem={({ item }) => <KullaniciSatiri kisi={item} />}
      ItemSeparatorComponent={() => <View className="h-2" />}
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
              {t('takip.listeAlinamadi')}
            </Text>
          )}
        </>
      }
      ListEmptyComponent={data ? <BosDurum ikon={Users} baslik={t(METINLER[liste].bos)} /> : null}
      ListFooterComponent={
        isFetchingNextPage ? <Text className="mt-4 text-body text-muted">{t('ortak.yukleniyor')}</Text> : null
      }
    />
  );
}
