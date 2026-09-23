import { useState } from 'react';
import { View, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
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
}

/**
 * Acik antrenmanin listenin sonundaki alani: dinlenme sayaci + "Hareket ekle" (#62). #274'ten beri
 * set paneli burada DEGIL, secili kartin altinda acilir (`SetPaneli`) -- eskiden bu alanla birlikte
 * ekranin altina yaslanip karttan kopuk duruyordu.
 */
export default function AntrenmanAltAlani({ dinlenme, onDinlenmeDegis, egzersizler, onHareketEkle }: Props) {
  const [hareketEkleAcik, setHareketEkleAcik] = useState(false);

  return (
    // `mt-auto` YOK (#274): kisa listede ekranin dibine itilmez, son kartin hemen ardinda durur (web #226).
    <View className="pb-2" style={{ marginBottom: TABBAR_HALKA_TASMASI }}>
      <View className="flex-col gap-2 rounded-xl bg-surface-3 p-3">
        <DinlenmeSayaci dinlenme={dinlenme} onDegis={onDinlenmeDegis} />
        {hareketEkleAcik ? (
          <HareketEklePaneli
            egzersizler={egzersizler}
            onSec={(exerciseId) => {
              setHareketEkleAcik(false);
              onHareketEkle(exerciseId);
            }}
            onKapat={() => setHareketEkleAcik(false)}
          />
        ) : (
          <BirincilDugme yukseklik="normal" onPress={() => setHareketEkleAcik(true)}>
            <Plus color={ikonRenk.onAccent} size={20} />
            <Text className="text-body-lg font-bold text-on-accent">Hareket ekle</Text>
          </BirincilDugme>
        )}
      </View>
    </View>
  );
}
