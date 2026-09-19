import { View, Text } from 'react-native';
import { Timer } from 'lucide-react-native';
import { kalanSureMetni } from '@grind/shared/lib/dinlenme';
import { ikonRenk } from './renkler';

/** Setten once GERCEKTE ne kadar dinlenildigi (#71), `m:ss`. `null` = oturumun ilk seti. */
export default function DinlenmeHapi({ saniye }: { saniye: number | null }) {
  if (saniye === null) {
    return null;
  }

  return (
    <View className="flex-row items-center gap-1">
      <Timer color={ikonRenk.muted} size={14} />
      <Text className="text-label-xs text-muted">{kalanSureMetni(saniye * 1000)}</Text>
    </View>
  );
}
