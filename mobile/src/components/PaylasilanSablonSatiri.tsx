import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SharedSablon } from '@grind/shared/api/queries';
import type { SablonOzeti } from '@grind/shared/lib/sablonOzeti';
import SablonFiguru from '../ui/SablonFiguru';

interface Props {
  kullaniciAdi: string;
  sablon: SharedSablon;
  ozet: SablonOzeti;
}

/** #467: liste satırı -- dokununca salt-okunur detay ekranına gider. */
export default function PaylasilanSablonSatiri({ kullaniciAdi, sablon, ozet }: Props) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/profile/u/${kullaniciAdi}/templates/${sablon.id}` as never)}
      className="flex-row items-center gap-3 rounded-xl border border-surface-4 bg-surface-2 p-4"
    >
      <SablonFiguru kategori={ozet.kategori} boyut={40} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body-lg text-fg">{sablon.name}</Text>
        <Text numberOfLines={1} className="text-label text-muted">{ozet.hareketAdlari.join(', ')}</Text>
      </View>
    </Pressable>
  );
}
