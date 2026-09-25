import { View, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

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
  return (
    <>
      {IOS && <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />}
      <View pointerEvents="none" className={`absolute inset-0 ${IOS ? 'bg-surface-2/70' : 'bg-surface-2/95'}`} />
    </>
  );
}
