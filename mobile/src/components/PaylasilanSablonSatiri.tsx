import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SharedSablon } from '@grind/shared/api/queries';
import type { SablonOzeti } from '@grind/shared/lib/sablonOzeti';
import SablonFiguru from '../ui/SablonFiguru';
import CamKart from '../ui/CamKart';

interface Props {
  kullaniciAdi: string;
  sablon: SharedSablon;
  ozet: SablonOzeti;
}

/**
 * #467: liste satırı -- dokununca salt-okunur detay ekranına gider. #592: cam kart (spec Karar 9),
 * diger liste satirlariyla ayni kose.
 */
export default function PaylasilanSablonSatiri({ kullaniciAdi, sablon, ozet }: Props) {
  const router = useRouter();
  return (
    <CamKart
      accessibilityLabel={[sablon.name, ...ozet.hareketAdlari].join(', ')}
      onPress={() => router.push(`/profile/u/${kullaniciAdi}/templates/${sablon.id}` as never)}
      className="flex-row items-center gap-3 p-4"
    >
      <SablonFiguru kategori={ozet.kategori} boyut={40} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-lg text-fg">{sablon.name}</Text>
        <Text numberOfLines={1} className="text-label text-muted">{ozet.hareketAdlari.join(', ')}</Text>
      </View>
    </CamKart>
  );
}
