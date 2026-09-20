import { useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { Link } from 'expo-router';
import { Brain, ChevronLeft, Sparkles, Trash2 } from 'lucide-react-native';
import {
  useDeleteInsight,
  useGenerateInsight,
  useInfiniteInsights,
  useInsightGenerationState,
  type Yorum,
} from '@grind/shared/api/queries';
import { ApiError } from '@grind/shared/api/problem';
import { apiHatasiniAyir } from '@grind/shared/lib/apiErrors';
import { formatTrDate, formatTrTime } from '@grind/shared/lib/format';
import { usePageTitle } from '@grind/shared/pageTitle';
import BirincilDugme from '../../src/ui/BirincilDugme';
import IkincilDugme from '../../src/ui/IkincilDugme';
import IkonDugmesi from '../../src/ui/IkonDugmesi';
import BosDurum from '../../src/ui/BosDurum';
import HataKutusu from '../../src/ui/HataKutusu';
import { ikonRenk } from '../../src/ui/renkler';

/**
 * web/src/pages/InsightsPage.tsx ile ayni (issue #76). Sayfalama Onceki/Sonraki dugmeleri
 * yerine SONSUZ KAYDIRMA'dir (issue #147, Gecmis'in #142'siyle ayni desen): `FlatList`in
 * `onEndReached`i listenin sonuna gelinince bir sonraki 25'lik sayfayi ceker.
 */
export default function InsightsScreen() {
  usePageTitle('AI yorumu');
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteInsights();
  const uretMutasyonu = useGenerateInsight();
  // Issue #148: web ile ayni -- "uretiliyor mu" bilgisi ekranin mutation'indan DEGIL, sekme
  // degisse de yasayan MutationCache'ten okunur.
  const { uretiliyor, iptalEt: uretimiIptalEt } = useInsightGenerationState();
  const silMutasyonu = useDeleteInsight();

  const [durum, setDurum] = useState<'bos' | 'iptal-edildi' | 'bilgi' | 'hata'>('bos');
  const [bilgiMesaji, setBilgiMesaji] = useState<string | null>(null);
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [silinecekId, setSilinecekId] = useState<number | null>(null);

  function yorumIste() {
    setDurum('bos');
    setGenelHata(null);
    const controller = new AbortController();

    uretMutasyonu.mutate(controller, {
      onError: (hata) => {
        if (controller.signal.aborted) {
          return;
        }
        if (hata instanceof ApiError && (hata.status === 503 || hata.status === 429)) {
          setBilgiMesaji(hata.detail);
          setDurum('bilgi');
          return;
        }
        setGenelHata(apiHatasiniAyir(hata, []).genelHata);
        setDurum('hata');
      },
    });
  }

  function iptalEt() {
    uretimiIptalEt();
    setDurum('iptal-edildi');
  }

  const tumYorumlar = data?.pages.flatMap((sayfa) => sayfa.items) ?? [];

  return (
    <FlatList
      testID="yorum-liste"
      data={tumYorumlar}
      keyExtractor={(yorum) => String(yorum.id)}
      renderItem={({ item }) => (
        <YorumKarti
          yorum={item}
          onayAcik={silinecekId === item.id}
          onSilmeyeBasla={() => setSilinecekId(item.id)}
          onVazgec={() => setSilinecekId(null)}
          onSil={() => {
            silMutasyonu.mutate(item.id);
            setSilinecekId(null);
          }}
        />
      )}
      ItemSeparatorComponent={() => <View className="h-3" />}
      contentContainerClassName="px-4 pt-2 pb-4"
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      }}
      ListHeaderComponent={
        <View className="mb-5 flex-col gap-5">
          <Link href="/profile/history" className="min-h-11 flex-row items-center gap-1">
            <ChevronLeft color={ikonRenk.muted} size={18} />
            <Text className="text-label text-muted">Geçmiş</Text>
          </Link>

          <Text className="text-body text-muted">
            Son 30 güne kadarki antrenman verini yapay zekaya yorumlatır. Belirli bir aralık
            seçmek şimdilik mümkün değil.
          </Text>

          <View className="flex-col gap-3 rounded-xl bg-surface-1 p-4">
            {!uretiliyor && (
              <BirincilDugme yukseklik="normal" onPress={yorumIste}>
                <Sparkles color={ikonRenk.onAccent} size={20} />
                <Text className="text-body-lg font-bold text-on-accent">Yorum iste</Text>
              </BirincilDugme>
            )}

            {uretiliyor && (
              <View className="flex-col gap-3">
                <Text className="text-body text-muted">
                  Yorum hazırlanıyor... Bu birkaç dakika sürebilir.
                </Text>
                <IkincilDugme onPress={iptalEt}>Vazgeç</IkincilDugme>
              </View>
            )}

            {durum === 'iptal-edildi' && (
              <Text className="text-label text-muted">
                Beklemeyi durdurdun. Yorum yine de oluşturuluyor olabilir; birkaç dakika sonra
                listede görünebilir.
              </Text>
            )}

            {durum === 'bilgi' && bilgiMesaji && (
              <Text className="text-label text-muted">{bilgiMesaji}</Text>
            )}

            {durum === 'hata' && genelHata && <HataKutusu baslik="Yorum alınamadı" mesaj={genelHata} />}
          </View>

          {isLoading && <Text className="text-body text-muted">Yükleniyor...</Text>}

          {isError && (
            <Text accessibilityRole="alert" className="text-body text-danger">
              Yorumlar alınamadı. Lütfen sayfayı yenileyin.
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        !isLoading && !isError && data ? (
          <BosDurum ikon={Brain} baslik="Henüz yorum yok" aciklama="Yukarıdan ilk yorumunu iste." />
        ) : null
      }
      ListFooterComponent={
        isFetchingNextPage ? <Text className="text-body text-muted">Yükleniyor...</Text> : null
      }
    />
  );
}

interface YorumKartiProps {
  yorum: Yorum;
  onayAcik: boolean;
  onSilmeyeBasla: () => void;
  onVazgec: () => void;
  onSil: () => void;
}

function YorumKarti({ yorum, onayAcik, onSilmeyeBasla, onVazgec, onSil }: YorumKartiProps) {
  if (onayAcik) {
    return (
      <View className="flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <Text className="text-body text-fg">Bu yorum kalıcı olarak silinecek.</Text>
        <View className="flex-row gap-2">
          <Pressable onPress={onSil} className="h-12 flex-1 items-center justify-center rounded-xl bg-danger-bg">
            <Text className="text-label text-on-danger-bg">Evet, sil</Text>
          </Pressable>
          <View className="flex-1">
            <IkincilDugme onPress={onVazgec}>Vazgeç</IkincilDugme>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-col gap-2 rounded-xl bg-surface-2 p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="text-label text-muted">
          {formatTrDate(yorum.createdAt)} {formatTrTime(yorum.createdAt)}
        </Text>
        <IkonDugmesi etiket="Yorumu sil" onPress={onSilmeyeBasla}>
          <Trash2 color={ikonRenk.muted} size={18} />
        </IkonDugmesi>
      </View>
      <Text className="text-body text-fg">{yorum.content}</Text>
    </View>
  );
}
