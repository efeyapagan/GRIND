import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useFinishSession, useOpenSession, type Zorluk } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import EkranKaydirici from '../../src/ui/EkranKaydirici';
import BirincilDugme from '../../src/ui/BirincilDugme';
import ZorlukKadrani from '../../src/components/ZorlukKadrani';
import { TABBAR_HALKA_TASMASI } from '../../src/ui/KabukTabBar';

/** Kadran burada açılır: ortadaki kademe, hiç dokunmadan bitirenin göndereceği değerdir. */
const VARSAYILAN_ZORLUK: Zorluk = 'Medium';

/**
 * Antrenmanı kapatan ekran (#153). "Antrenmanı bitir" artık antrenman ekranında oturumu kapatmaz,
 * buraya getirir: kullanıcı zorluğu kadranı çevirerek seçer, sonra bitirir. Zorluk YALNIZCA
 * bitirirken alınır (sunucuda sonradan değiştiren bir uç yok), bu yüzden soru bitirmenin önünde durur.
 *
 * Seçim zorunlu değil: "Atla" antrenmanı zorluksuz kapatır (sunucuda alan nullable). Geri dönülürse
 * oturum açık kalır — bu ekran hiçbir şeyi kendiliğinden kapatmaz.
 */
export default function AntrenmanBitirScreen() {
  usePageTitle('Nasıl geçti?');
  const router = useRouter();
  const { data: oturum, isLoading, isError } = useOpenSession();
  const bitirMutasyonu = useFinishSession();
  const [zorluk, setZorluk] = useState<Zorluk>(VARSAYILAN_ZORLUK);

  if (isLoading) {
    return (
      <View className="flex-1 px-4 pt-2">
        <Text className="text-body text-muted">Yükleniyor...</Text>
      </View>
    );
  }

  // Kapatılacak antrenman yok (doğrudan açıldı ya da başka bir yerde kapandı): boş bir kadran
  // göstermek yerine antrenman ekranına dönülür.
  if (isError || !oturum) {
    return <Redirect href="/antrenman" />;
  }

  function bitir(secilen: Zorluk | null) {
    bitirMutasyonu.mutate(
      { sessionId: oturum!.id, zorluk: secilen },
      { onSuccess: () => router.replace('/') },
    );
  }

  return (
    <EkranKaydirici contentContainerClassName="flex-grow items-center gap-6 px-4 pt-6 pb-4">
      <Text className="text-center text-body text-muted">
        Bu antrenman sana nasıl geldi? Kadranı çevirerek seç.
      </Text>

      <ZorlukKadrani deger={zorluk} onDegis={setZorluk} />

      {bitirMutasyonu.isError && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          Antrenman bitirilemedi. Lütfen tekrar deneyin.
        </Text>
      )}

      <View className="mt-auto w-full items-center gap-2" style={{ marginBottom: TABBAR_HALKA_TASMASI }}>
        <BirincilDugme
          yukseklik="buyuk"
          disabled={bitirMutasyonu.isPending}
          onPress={() => bitir(zorluk)}
        >
          Antrenmanı bitir
        </BirincilDugme>
        <Pressable
          accessibilityRole="button"
          disabled={bitirMutasyonu.isPending}
          onPress={() => bitir(null)}
          className={`min-h-11 items-center justify-center rounded-lg px-4 ${bitirMutasyonu.isPending ? 'opacity-60' : ''}`}
        >
          <Text className="text-label text-muted">Atla</Text>
        </Pressable>
      </View>
    </EkranKaydirici>
  );
}
