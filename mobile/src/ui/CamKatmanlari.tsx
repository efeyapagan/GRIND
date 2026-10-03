import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import CamYuzey from './CamYuzey';
import { useRenkPaleti } from './renkler';

interface Props {
  /** Kenar ve kirpma koseleri; kapsayicinin kosesiyle ayni olmali. */
  koseSinifi?: string;
  /** `CamKart`in vurgusu (#559): soluk sac teli yerine tam opak `accent` kenar. */
  vurguluKenar?: boolean;
  /**
   * #590: kosesi ANIMASYONLA degisen kap icin (`GecmisDetayPaneli` hap biciminden karta acilir) kenarin
   * stili -- `useAnimatedStyle`'dan gelen `borderRadius`. Sabit bir `koseSinifi` o kaba uymaz; blur ve
   * parilti kabin kendi kirpmasina birakilir (`koseSinifi=""`), kenar bu stille koseyi izler.
   */
  kenarStili?: AnimatedStyle<ViewStyle>;
}

/**
 * Liquid Glass'in GORUNTU katmanlari (gorsel tasarim spec'i Karar 9): gercek blur, ustten sonen parilti ve
 * sac teli kenar. Kapsayicinin ILK cocugu olarak, `relative` bir kabin icine serilir; yalnizca bu katmanlar
 * koseye kirpilir, kabin icerigi kirpilmaz (#559). `CamKart` ve cam `Modal` (#586) ortak.
 *
 * Yari saydamlik yeni bir token DEGIL, mevcut `fg`'nin tam opak rengi + KATMANIN opakligi: `fg` koyu
 * temada acik, acik temada koyu oldugu icin parilti ve kenar iki temada da kendiliginden dogru tonu alir.
 */
export default function CamKatmanlari({ koseSinifi = 'rounded-3xl', vurguluKenar = false, kenarStili }: Props) {
  const palet = useRenkPaleti();
  return (
    <View pointerEvents="none" className={`absolute inset-0 overflow-hidden ${koseSinifi}`}>
      <CamYuzey />
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="cam-parilti" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palet.fg} stopOpacity={0.08} />
            <Stop offset="0.55" stopColor={palet.fg} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#cam-parilti)" />
      </Svg>
      {/* Opaklik KATMANIN kendisinde: renkler Tailwind'e `var(--color-*)` olarak bagli ve `border-fg/10`
          gibi bir opaklik eki degiskene uygulanamayip kenari SIYAH ciziyordu (#547'de simulatorde goruldu). */}
      <Animated.View
        testID="cam-kenar"
        style={kenarStili}
        className={`absolute inset-0 border ${koseSinifi} ${vurguluKenar ? 'border-2 border-accent' : 'border-fg opacity-10'}`}
      />
    </View>
  );
}
