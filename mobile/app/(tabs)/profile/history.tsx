import { useCallback } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Brain, CalendarDays } from 'lucide-react-native';
import { oturumSilindiTazele, oturumuSil, useInfiniteHistory, type GecmisOturum } from '@grind/shared/api/queries';
import { GERI_AL_MS, useGecikmeliSilme } from '@grind/shared/lib/gecikmeliSilme';
import { usePageTitle } from '@grind/shared/pageTitle';
import GecmisKarti from '../../../src/components/GecmisKarti';
import BosDurum from '../../../src/ui/BosDurum';
import GeriAlSeridi from '../../../src/ui/GeriAlSeridi';
import { ikonRenk } from '../../../src/ui/renkler';

/**
 * web/src/pages/HistoryPage.tsx ile ayni (issue #46, sonsuz kaydirma #142). Sallama-ile-geri-alma
 * (DeviceMotion, web'e ozel) BILEREK atlandi -- "Geri al" seridindeki dokunma butonu tek (ve
 * web'de de var olan) yol.
 *
 * Sayfalama Onceki/Sonraki dugmeleri yerine SONSUZ KAYDIRMA'dir (issue #142, web'in #138'i ile
 * ayni desen): `FlatList`in `onEndReached`i listenin sonuna gelinince bir sonraki 25'lik sayfayi
 * ceker; sayfalar TanStack Query'nin kendi `pages` dizisinde birikir, istemci ayri bir
 * "biriktirilmis liste" state'i TUTMAZ.
 */
export default function HistoryScreen() {
  const { t } = useTranslation();
  usePageTitle('Geçmiş');
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteHistory();
  const queryClient = useQueryClient();
  const silmeyiTamamla = useCallback(
    (oturum: GecmisOturum) => {
      void oturumuSil(oturum.sessionId).then(
        () => oturumSilindiTazele(queryClient, oturum.sessionId),
        () => undefined,
      );
    },
    [queryClient],
  );
  const { bekleyen, baslat, geriAl, sureDoldu } = useGecikmeliSilme(silmeyiTamamla);

  // Sunucudan gelen TUM sayfalarin oturumlari BIRLIKTE, sunucu sirasiyla -- `pages` TanStack
  // Query'nin kendi biriktirdigi dizidir. Bekleyen silme listeden hemen kalkar; geri alinirsa
  // sunucudan silinmedigi icin oldugu gibi doner.
  const tumOturumlar = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];
  const gorunenler = tumOturumlar.filter((o) => o.sessionId !== bekleyen?.sessionId);

  return (
    <FlatList
      testID="gecmis-liste"
      data={gorunenler}
      keyExtractor={(oturum) => String(oturum.sessionId)}
      renderItem={({ item }) => <GecmisKarti oturum={item} onSil={() => baslat(item)} />}
      ItemSeparatorComponent={() => <View className="h-4" />}
      contentContainerClassName="px-4 pt-2 pb-4"
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      }}
      ListHeaderComponent={
        <View className="mb-5 flex-col gap-5">
          <Link href="/insights" asChild>
            <Pressable className="h-12 w-full flex-row items-center justify-center gap-2 rounded-xl bg-surface-3 px-4">
              <Brain color={ikonRenk.fg} size={18} />
              <Text className="text-label text-fg">{t('yorumlar.baslik')}</Text>
            </Pressable>
          </Link>

          {isLoading && <Text className="text-body text-muted">Yükleniyor...</Text>}

          {isError && (
            <Text accessibilityRole="alert" className="text-body text-danger">
              Geçmiş alınamadı. Lütfen sayfayı yenileyin.
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        !isLoading && !isError && data ? (
          <BosDurum ikon={CalendarDays} baslik="Henüz antrenman geçmişi yok" />
        ) : null
      }
      ListFooterComponent={
        <View className="mt-5 flex-col gap-5">
          {isFetchingNextPage && <Text className="text-body text-muted">Yükleniyor...</Text>}
          {bekleyen && (
            <GeriAlSeridi
              key={bekleyen.sessionId}
              mesaj="Antrenman silindi"
              sureMs={GERI_AL_MS}
              onGeriAl={geriAl}
              onSureDoldu={sureDoldu}
            />
          )}
        </View>
      }
    />
  );
}
