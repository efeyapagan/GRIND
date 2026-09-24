import { View, Text } from 'react-native';
import { CircleCheck, Plus } from 'lucide-react-native';
import type { Egzersiz } from '@grind/shared/api/queries';
import type { Dinlenme } from '@grind/shared/lib/dinlenme';
import BirincilDugme from '../ui/BirincilDugme';
import DinlenmeSayaci from './DinlenmeSayaci';
import HareketEklePaneli from './HareketEklePaneli';
import { ikonRenk } from '../ui/renkler';
import { TABBAR_HALKA_TASMASI } from '../ui/KabukTabBar';

interface Props {
  dinlenme: Dinlenme | null;
  onDinlenmeDegis: (dinlenme: Dinlenme | null) => void;
  egzersizler: readonly Egzersiz[];
  onHareketEkle: (exerciseId: number) => void;
  /**
   * Panel acik mi -- artik `antrenman.tsx`de tutulur (issue #273), ust baslikta AYNI paneli acan
   * kisayolla paylasilsin diye.
   */
  acik: boolean;
  onAcikDegis: (acik: boolean) => void;
  /**
   * Issue #273: set girilmis (dolu) bir oturumda kapali durumda "Hareket ekle" yerine "Antrenmani
   * bitir" durur -- sablon uzerinden gidildigi icin hareket eklemek nadiren gerekir, bitirmekse EN
   * SIK yapilan islemdir; bos oturumda (#47) hala "Hareket ekle" gosterilir, "bitir" bos bir
   * antrenmani gecmise birakirdi.
   */
  bitirCagrisi?: { onBitir: () => void };
}

/**
 * Acik antrenmanin listenin sonundaki alani: dinlenme sayaci + "Hareket ekle"/"Antrenmani bitir"
 * (#62, düzeni #273'te değişti). #274'ten beri set paneli burada DEGIL, secili kartin altinda acilir
 * (`SetPaneli`) -- eskiden bu alanla birlikte ekranin altina yaslanip karttan kopuk duruyordu.
 */
export default function AntrenmanAltAlani({
  dinlenme,
  onDinlenmeDegis,
  egzersizler,
  onHareketEkle,
  acik,
  onAcikDegis,
  bitirCagrisi,
}: Props) {
  return (
    // `mt-auto` YOK (#274): kisa listede ekranin dibine itilmez, son kartin hemen ardinda durur (web #226).
    <View className="pb-2" style={{ marginBottom: TABBAR_HALKA_TASMASI }}>
      <View className="flex-col gap-2 rounded-xl bg-surface-3 p-3">
        <DinlenmeSayaci dinlenme={dinlenme} onDegis={onDinlenmeDegis} />
        {acik ? (
          <HareketEklePaneli
            egzersizler={egzersizler}
            onSec={(exerciseId) => {
              onAcikDegis(false);
              onHareketEkle(exerciseId);
            }}
            onKapat={() => onAcikDegis(false)}
          />
        ) : bitirCagrisi ? (
          <BirincilDugme yukseklik="normal" onPress={bitirCagrisi.onBitir}>
            <CircleCheck color={ikonRenk.onAccent} size={20} />
            <Text className="text-body-lg font-bold text-on-accent">Antrenmanı bitir</Text>
          </BirincilDugme>
        ) : (
          <BirincilDugme yukseklik="normal" onPress={() => onAcikDegis(true)}>
            <Plus color={ikonRenk.onAccent} size={20} />
            <Text className="text-body-lg font-bold text-on-accent">Hareket ekle</Text>
          </BirincilDugme>
        )}
      </View>
    </View>
  );
}
