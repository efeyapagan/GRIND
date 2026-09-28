import { View, Text } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { useIkonRenk } from './renkler';

/**
 * Formun genel hatasi (spec): danger-bg kutu, baslik + mesaj. `ayrinti` (#510) hatanin kendi
 * teknik metnidir -- kullanicinin cihazda gordugunu bize aktarabilmesi icin mesajin altinda,
 * kucuk yazilir.
 */
export default function HataKutusu({ baslik, mesaj, ayrinti }: { baslik: string; mesaj: string; ayrinti?: string }) {
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
        {ayrinti ? <Text className="mt-1 text-label text-on-danger-bg">{ayrinti}</Text> : null}
      </View>
    </View>
  );
}
