import { StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useRenkPaleti } from './renkler';

/**
 * Cam kartin icindeki iki satir arasindaki sac teli cizgi (#615). Opaklik SVG ozelliginde (spec Karar 9):
 * `bg-fg/10` gibi bir ek degiskene bagli renkte uygulanmaz, cizgiyi siyah cizer. Tek basina degil
 * `AyiricliListe` uzerinden kullanilir -- cizginin yalnizca satir ARALARINA dusmesi orada.
 */
export default function CamAyirici() {
  const palet = useRenkPaleti();
  return (
    <Svg testID="cam-ayirici" pointerEvents="none" style={stiller.cizgi}>
      <Rect width="100%" height="100%" fill={palet.fg} fillOpacity={0.1} />
    </Svg>
  );
}

const stiller = StyleSheet.create({
  cizgi: { width: '100%', height: StyleSheet.hairlineWidth },
});
