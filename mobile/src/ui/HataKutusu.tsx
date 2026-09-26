import { View, Text } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { useIkonRenk } from './renkler';

/** Formun genel hatasi (spec): danger-bg kutu, baslik + mesaj. */
export default function HataKutusu({ baslik, mesaj }: { baslik: string; mesaj: string }) {
  const ikonRenk = useIkonRenk();
  return (
    <View
      accessibilityRole="alert"
      className="flex-row items-start gap-2 rounded-lg bg-danger-bg p-4"
    >
      <CircleAlert color={ikonRenk.danger} size={20} style={{ marginTop: 2 }} />
      <View className="flex-1 flex-col">
        <Text className="text-label font-bold text-on-danger-bg">{baslik}</Text>
        <Text className="text-body text-on-danger-bg">{mesaj}</Text>
      </View>
    </View>
  );
}
