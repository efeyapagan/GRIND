import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useOpenSession } from '@grind/shared/api/queries';
import { formatTrTime } from '@grind/shared/lib/format';
import BirincilDugme from '../ui/BirincilDugme';
import TurEtiketi from '../ui/TurEtiketi';

/**
 * web/src/components/DevamEdenAntrenman.tsx ile ayni (issue #175).
 *
 * Uygulama her acilista Ana sayfaya duser ve orasi devam eden antrenmandan habersizdi -- veri
 * sunucuda dururken kullanici icin antrenman "kaybolmus" goruntusu olusuyordu. Bu kart acik
 * oturumu gorunur kilar. Oturum yokken (ya da sorgu henuz yuklenmemisken) HIC cizilmez: antrenmansiz
 * bir gunde Ana sayfa bugunku haliyle kalir.
 */
export default function DevamEdenAntrenman() {
  const { data: oturum } = useOpenSession();
  const router = useRouter();

  if (!oturum?.isOpen) {
    return null;
  }

  return (
    <View className="flex-col gap-3 rounded-xl bg-surface-2 p-4">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1">
          <View className="size-2 rounded-full bg-muted" />
          <Text className="text-label text-fg">Devam ediyor</Text>
        </View>
        <Text className="text-label text-muted">Başlangıç {formatTrTime(oturum.startedAt)}</Text>
      </View>
      {oturum.templateName && <TurEtiketi>{oturum.templateName}</TurEtiketi>}
      <BirincilDugme yukseklik="normal" onPress={() => router.navigate('/antrenman')}>
        Devam et
      </BirincilDugme>
    </View>
  );
}
