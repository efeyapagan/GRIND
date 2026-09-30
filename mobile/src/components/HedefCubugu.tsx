import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useRenkPaleti } from '../ui/renkler';

const YUKSEKLIK = 6;

/**
 * Arkadas satirinin donemlik hedef cubugu (#491, gorsel tasarim spec'i Karar 9 "ince cizim dili").
 * NativeWind View'larla cizilince kaba kaliyordu; ray `fg` %12, dolgu `accent` gradyani (dipte %35,
 * ucta tam). Genislikler yuzde: olcum (`onLayout`) gerekmez, yerlesim ustteki satira birakilir.
 */
export default function HedefCubugu({ oran }: { oran: number }) {
  const palet = useRenkPaleti();
  const yuzde = `${Math.round(oran * 100)}%`;
  return (
    <View testID="hedef-kanali" className="min-w-0 flex-1" style={{ height: YUKSEKLIK }}>
      <Svg width="100%" height={YUKSEKLIK}>
        <Defs>
          <LinearGradient id="hedef-dolgu-gradyani" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={palet.accent} stopOpacity={0.35} />
            <Stop offset="1" stopColor={palet.accent} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect
          testID="hedef-ray"
          width="100%"
          height={YUKSEKLIK}
          rx={YUKSEKLIK / 2}
          fill={palet.fg}
          fillOpacity={0.12}
        />
        <Rect
          testID="hedef-dolgu"
          width={yuzde}
          height={YUKSEKLIK}
          rx={YUKSEKLIK / 2}
          fill="url(#hedef-dolgu-gradyani)"
        />
      </Svg>
    </View>
  );
}
