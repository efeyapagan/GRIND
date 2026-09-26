import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import BirincilDugme from '../ui/BirincilDugme';
import { useIkonRenk } from '../ui/renkler';

/**
 * web/src/components/SablonOlusturCagrisi.tsx ile ayni (issue #61). #272: kaydedince donulen yer
 * `/` (ana sayfa/takvim) degil `/antrenman` -- sablon kartlari ve "Sablonla basla" orada, kullanici
 * olusturdugu sablonla hemen antrenmana baslayabilsin.
 */
export default function SablonOlusturCagrisi() {
  const ikonRenk = useIkonRenk();
  const router = useRouter();

  return (
    <View className="pb-2">
      <BirincilDugme
        yukseklik="normal"
        onPress={() => router.push({ pathname: '/templates/new', params: { donus: '/antrenman' } })}
      >
        <Plus color={ikonRenk.onAccent} size={20} />
        <Text className="text-body-lg font-bold text-on-accent">Şablon oluştur</Text>
      </BirincilDugme>
    </View>
  );
}
