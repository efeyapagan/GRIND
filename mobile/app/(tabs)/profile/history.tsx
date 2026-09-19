import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Brain, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { oturumSilindiTazele, oturumuSil, useHistory, type GecmisOturum } from '@grind/shared/api/queries';
import { GERI_AL_MS, useGecikmeliSilme } from '@grind/shared/lib/gecikmeliSilme';
import { usePageTitle } from '@grind/shared/pageTitle';
import GecmisKarti from '../../../src/components/GecmisKarti';
import BosDurum from '../../../src/ui/BosDurum';
import GeriAlSeridi from '../../../src/ui/GeriAlSeridi';
import { ikonRenk } from '../../../src/ui/renkler';

/**
 * web/src/pages/HistoryPage.tsx ile ayni (issue #46). Sallama-ile-geri-alma (DeviceMotion, web'e
 * ozel) BILEREK atlandi -- "Geri al" seridindeki dokunma butonu tek (ve web'de de var olan) yol.
 */
export default function HistoryScreen() {
  usePageTitle('Geçmiş');
  const [sayfa, setSayfa] = useState(1);
  const { data, isLoading, isError } = useHistory(sayfa);
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

  const gorunenler = data?.items.filter((o) => o.sessionId !== bekleyen?.sessionId) ?? [];

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2 pb-4">
      <Link href="/insights" asChild>
        <Pressable className="h-12 w-full flex-row items-center justify-center gap-2 rounded-xl bg-surface-3 px-4">
          <Brain color={ikonRenk.fg} size={18} />
          <Text className="text-label text-fg">AI yorumu</Text>
        </Pressable>
      </Link>

      {isLoading && <Text className="text-body text-muted">Yükleniyor...</Text>}

      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          Geçmiş alınamadı. Lütfen sayfayı yenileyin.
        </Text>
      )}

      {!isLoading && !isError && data && gorunenler.length === 0 && (
        <BosDurum ikon={CalendarDays} baslik="Henüz antrenman geçmişi yok" />
      )}

      {!isLoading && !isError && data && gorunenler.length > 0 && (
        <>
          <View className="flex-col gap-4">
            {gorunenler.map((oturum) => (
              <GecmisKarti key={oturum.sessionId} oturum={oturum} onSil={() => baslat(oturum)} />
            ))}
          </View>
          <View className="mt-3 flex-row items-center justify-between gap-4">
            <Pressable
              onPress={() => setSayfa((s) => s - 1)}
              disabled={data.page <= 1}
              className={`h-13 flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-surface-2 ${data.page <= 1 ? 'opacity-60' : ''}`}
            >
              <ChevronLeft color={ikonRenk.fg} size={18} />
              <Text className="text-label text-fg uppercase">Önceki</Text>
            </Pressable>
            <View className="shrink-0 flex-col items-center px-2">
              <Text className="text-label text-fg">
                Sayfa {data.page} / {data.totalPages}
              </Text>
              <Text className="text-label-xs text-muted">{data.totalCount} antrenman</Text>
            </View>
            <Pressable
              onPress={() => setSayfa((s) => s + 1)}
              disabled={data.page >= data.totalPages}
              className={`h-13 flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-surface-2 ${data.page >= data.totalPages ? 'opacity-60' : ''}`}
            >
              <Text className="text-label text-fg uppercase">Sonraki</Text>
              <ChevronRight color={ikonRenk.fg} size={18} />
            </Pressable>
          </View>
        </>
      )}

      {bekleyen && (
        <GeriAlSeridi
          key={bekleyen.sessionId}
          mesaj="Antrenman silindi"
          sureMs={GERI_AL_MS}
          onGeriAl={geriAl}
          onSureDoldu={sureDoldu}
        />
      )}
    </ScrollView>
  );
}
