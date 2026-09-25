import { View } from 'react-native';
import type { Egzersiz } from '@grind/shared/api/queries';
import HareketSecici from '../ui/HareketSecici';

interface Props {
  egzersizler: readonly Egzersiz[];
  onSec: (exerciseId: number) => void;
  onKapat: () => void;
}

/** web/src/components/HareketEklePaneli.tsx ile ayni (#62). */
export default function HareketEklePaneli({ egzersizler, onSec, onKapat }: Props) {
  return (
    // Panelin TEK icerigi arama satiri: uzerinde bir baslik satiri varken yukari acilan liste onu
    // ortuyor ve "duzgun acilmiyor" gorunumu veriyordu (kullanici bulgusu). Kapatma dugmesi de bu
    // yuzden basliga degil, arama alaninin ICINE konuldu -- liste orayi ASLA ortmez.
    <View className="flex-col gap-2">
      <HareketSecici
        id="hareket-ekle"
        egzersizler={egzersizler}
        secilenId={0}
        secilenAd=""
        onSec={onSec}
        otomatikOdak
        listeYukari
        onKapat={onKapat}
      />
    </View>
  );
}
