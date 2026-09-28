import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useRenkPaleti } from './renkler';

const CIZGI_YUKSEKLIGI = 10;
const CIZIM_SURESI_MS = 1200;

/**
 * #439: altini kavisli `accent` bir cizgiyle cizen sayfa basligi. Ekrana her girildiginde cizgi
 * soldan saga yavasca "cizilir": cizgi baslik genisliginde bir kez cizilir, uzerindeki pencere
 * 0'dan tam genislige acilir. Cihazda "hareketi azalt" aciksa (`ReduceMotion.System`) cizgi
 * dogrudan tam gorunur.
 */
export default function CizgiliBaslik({ children }: { children: string }) {
  const palet = useRenkPaleti();
  const [genislik, setGenislik] = useState(0);
  const ilerleme = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      ilerleme.value = 0;
      ilerleme.value = withTiming(1, {
        duration: CIZIM_SURESI_MS,
        easing: Easing.inOut(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    }, [ilerleme]),
  );

  const pencere = useAnimatedStyle(() => ({ width: genislik * ilerleme.value }), [genislik]);

  return (
    <View className="flex-col gap-1 self-start">
      <Text
        accessibilityRole="header"
        className="text-title font-bold text-fg"
        onLayout={(olay) => setGenislik(olay.nativeEvent.layout.width)}
      >
        {children}
      </Text>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="overflow-hidden"
        style={[{ height: CIZGI_YUKSEKLIGI }, pencere]}
      >
        {genislik > 0 && (
          <Svg testID="baslik-cizgisi" width={genislik} height={CIZGI_YUKSEKLIGI}>
            {/* Ortasi hafif yukari kalkan, sagda incelen el cizimi bir kavis. */}
            <Path
              d={`M2 ${CIZGI_YUKSEKLIGI - 3} Q ${genislik * 0.45} 1 ${genislik - 2} ${CIZGI_YUKSEKLIGI - 5}`}
              stroke={palet.accent}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        )}
      </Animated.View>
    </View>
  );
}
