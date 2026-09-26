import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useIkonRenk } from './renkler';

interface Props {
  ikon: LucideIcon;
  baslik: string;
  aciklama?: string;
}

/** Ortali bos durum: daire icinde ikon, baslik ve istege bagli aciklama. */
export default function BosDurum({ ikon: Ikon, baslik, aciklama }: Props) {
  const ikonRenk = useIkonRenk();
  return (
    <View className="items-center gap-4 px-4 py-16">
      <View className="size-16 items-center justify-center rounded-full bg-surface-2">
        <Ikon color={ikonRenk.muted} size={32} />
      </View>
      <View className="items-center gap-1">
        <Text className="text-heading text-fg">{baslik}</Text>
        {aciklama && <Text className="text-body text-muted">{aciklama}</Text>}
      </View>
    </View>
  );
}
