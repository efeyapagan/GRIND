import { Pressable, Text, View, StyleSheet, type PressableProps } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useRenkPaleti } from './renkler';

const YUKSEKLIK = { buyuk: 'h-14', normal: 'h-13', kompakt: 'h-11' } as const;

/** Parildin en ustteki opakligi; ortada (%55) sifira iner. Metin kontrastini korur (testte sabit). */
export const PARILTI_OPAKLIGI = 0.35;

interface Props extends PressableProps {
  yukseklik: keyof typeof YUKSEKLIK;
  children: React.ReactNode;
}

/**
 * Accent dolgulu birincil eylem; ustundeki metin her zaman `on-accent` (spec Karar 2). #491 Gorev 3:
 * ustten asagi sonen cok hafif bir parilti (`CamKart`in parilti dili) -- isik `alev-acik` (iki temada
 * ayni sicak acik ton), beyaz/gri degil; `react-native-svg` ile, yeni bagimlilik ve token yok. Parilti
 * `accent`'i acar, koyu `on-accent` metnin kontrasti dusmez artar.
 */
export default function BirincilDugme({ yukseklik, children, disabled, ...dugme }: Props) {
  const palet = useRenkPaleti();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...dugme}
      className={`w-full flex-row items-center justify-center gap-2 overflow-hidden rounded-xl bg-accent ${YUKSEKLIK[yukseklik]} ${disabled ? 'opacity-60' : ''}`}
    >
      <View testID="birincil-dugme-parilti" pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="birincil-parilti" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={palet['alev-acik']} stopOpacity={PARILTI_OPAKLIGI} />
              <Stop offset="0.55" stopColor={palet['alev-acik']} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#birincil-parilti)" />
        </Svg>
      </View>
      {typeof children === 'string' ? (
        <Text className="text-body-lg font-bold text-on-accent">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
