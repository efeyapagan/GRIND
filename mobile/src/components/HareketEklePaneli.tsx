import { View, Text } from 'react-native';
import { X } from 'lucide-react-native';
import type { Egzersiz } from '@grind/shared/api/queries';
import HareketSecici from '../ui/HareketSecici';
import IkonDugmesi from '../ui/IkonDugmesi';
import { ikonRenk } from '../ui/renkler';

interface Props {
  egzersizler: readonly Egzersiz[];
  onSec: (exerciseId: number) => void;
  onKapat: () => void;
}

/** web/src/components/HareketEklePaneli.tsx ile ayni (#62). */
export default function HareketEklePaneli({ egzersizler, onSec, onKapat }: Props) {
  return (
    <View className="flex-col gap-2">
      {/* `listeYukari` acilir listesi (z-30) buraya BINER -- z-40 olmadan kapatma X'i kapaninca
          bir daha ULASILAMAZ hale geliyordu (kullanici bulgusu: "hareket ekle'den cikamiyorum"). */}
      <View className="z-40 flex-row items-center justify-between gap-2">
        <Text className="pl-1 text-label text-muted uppercase">Hareket ekle</Text>
        <IkonDugmesi etiket="Hareket eklemeyi kapat" onPress={onKapat}>
          <X color={ikonRenk.muted} size={20} />
        </IkonDugmesi>
      </View>
      <HareketSecici
        id="hareket-ekle"
        egzersizler={egzersizler}
        secilenId={0}
        secilenAd=""
        onSec={onSec}
        otomatikOdak
        listeYukari
      />
    </View>
  );
}
