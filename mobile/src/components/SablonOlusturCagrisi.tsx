import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import BirincilDugme from '../ui/BirincilDugme';
import { ikonRenk } from '../ui/renkler';

/** web/src/components/SablonOlusturCagrisi.tsx ile ayni (issue #61). */
export default function SablonOlusturCagrisi() {
  const router = useRouter();

  return (
    <View className="pb-2">
      <BirincilDugme
        yukseklik="normal"
        onPress={() => router.push({ pathname: '/templates/new', params: { donus: '/' } })}
      >
        <Plus color={ikonRenk.onAccent} size={20} />
        <Text className="text-body-lg font-bold text-on-accent">Şablon oluştur</Text>
      </BirincilDugme>
    </View>
  );
}
