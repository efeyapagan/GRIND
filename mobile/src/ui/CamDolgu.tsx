import { StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useRenkPaleti } from './renkler';

interface Props {
  /** `fg` dolgusunun opakligi (ör. satir 0.06, kucuk karo 0.10). */
  opaklik: number;
  /** Kose yaricapi (pt); kapsayicinin kosesiyle ayni olmali (`rounded-lg` = 8). */
  yaricap: number;
}

/**
 * Cam kartin ICINDEKI ogenin zemini (#590; #589'daki kullanici bulgusu: "liquid'in icinde kutu kalmis"):
 * opak bir `bg-surface-*` kutu yerine camin ustune serilen hafif `fg` dolgusu. Kapsayicinin ILK cocugu
 * olarak serilir, dokunusu yutmaz.
 *
 * Opaklik SVG ozelliginde (spec Karar 9): `bg-fg opacity-5` gibi bir sinif degiskene bagli renkte
 * uygulanmayip ogeyi tam dolduruyordu (`ArkadasSatiri`ndaki kendi-satir vurgusuyla ayni ders). `fg` koyu
 * temada acik, acik temada koyu oldugu icin iki temada da dogru tonu alir.
 */
export default function CamDolgu({ opaklik, yaricap }: Props) {
  const palet = useRenkPaleti();
  return (
    <Svg testID="cam-dolgu" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Rect width="100%" height="100%" rx={yaricap} ry={yaricap} fill={palet.fg} fillOpacity={opaklik} />
    </Svg>
  );
}
