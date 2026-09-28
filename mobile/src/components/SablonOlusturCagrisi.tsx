import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { BASLATMA_GORUNUMU_YOLU } from '@grind/shared/lib/geriKaydirma';
import { Plus } from 'lucide-react-native';
import BirincilDugme from '../ui/BirincilDugme';
import { useAccentParlama, useIkonRenk } from '../ui/renkler';

/**
 * web/src/components/SablonOlusturCagrisi.tsx ile ayni (issue #61). #272: kaydedince donulen yer
 * `/` (ana sayfa/takvim) degil antrenman ekraninin "Antrenmana basla" YUZU -- sablon kartlari ve
 * "Sablonla basla" orada, kullanici olusturdugu sablonla hemen antrenmana baslayabilsin.
 */
export default function SablonOlusturCagrisi() {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const router = useRouter();
  const parlama = useAccentParlama();

  return (
    <View className="pb-2">
      <BirincilDugme
        yukseklik="normal"
        // #439: karttaki Basla dugmeleriyle ayni hafif parlama.
        style={parlama}
        // #502: donus duz `/antrenman` degil -- acik antrenman varken o yol antrenmanin kendisini
        // acip kullaniciyi antrenmanin ortasina dusuruyordu. Geri cikisla ayni hedef.
        onPress={() =>
          router.push({ pathname: '/templates/new', params: { donus: BASLATMA_GORUNUMU_YOLU } })
        }
      >
        <Plus color={ikonRenk.onAccent} size={20} />
        <Text className="text-body-lg font-bold text-on-accent">{t('sablonlar.olustur')}</Text>
      </BirincilDugme>
    </View>
  );
}
