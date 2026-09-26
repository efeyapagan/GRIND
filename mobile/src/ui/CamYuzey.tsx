import { View, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useEtkinTema } from './renkler';

const IOS = Platform.OS === 'ios';

/**
 * "Liquid glass" yuzey (#338 alt menu, #350 set paneli): kapsayicinin arkasina serilen cam katman.
 * Kapsayici `overflow-hidden` + kendi koseleri/kenarligiyla bu katmani kirpar; icerik bunun USTUNE
 * cizilir (katman ilk cocuk olmali).
 *
 * iOS'ta `expo-blur`un yerel bulanikligi, ustunde yari saydam `surface-2` perde -- renk platformun
 * malzemesinden degil bizim paletimizden gelir (`expo-glass-effect` yalnizca iOS 26). Android'de
 * bulaniklik YOK, perde neredeyse opak: `expo-blur`un Android yolu icerigin bir `BlurTargetView` ile
 * sarilmasini ister ve emulatorde denendiginde bulanik yerine acik gri bir yuzey cizdi (#338) --
 * guvenilir olmayan bir efekt yerine tutarli bir yuzey secildi.
 */
export default function CamYuzey() {
  // #271: `tint` sabit "dark" kalirsa acik temada cam, altindaki acik yuzeyi koyultur ve
  // uzerindeki perde griye doner -- alt menunun acik temada "kirli gri" gorunmesinin sebebi buydu.
  const etkinTema = useEtkinTema();
  return (
    <>
      {IOS && (
        <BlurView
          tint={etkinTema === 'acik' ? 'light' : 'dark'}
          intensity={40}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* Acik temada perde daha OPAK: camin altinda odak kartinin karartma katmani var ve %70'lik
          acik bir tul onu yeterince ortmeyip yuzeyi grilestiriyordu (kullanici bulgusu). */}
      <View
        pointerEvents="none"
        className={`absolute inset-0 ${
          !IOS ? 'bg-surface-2/95' : etkinTema === 'acik' ? 'bg-surface-1/90' : 'bg-surface-2/70'
        }`}
      />
    </>
  );
}
