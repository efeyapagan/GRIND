import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import CamYuzey from './CamYuzey';
import { useRenkPaleti } from './renkler';

interface Props {
  onPress?: () => void;
  /** Dokunulabilir kartin erisilebilir adi (ör. yalnizca ikondan olusan cam dugme). */
  accessibilityLabel?: string;
  /** Kartin ic duzeni (ör. `flex-row gap-3 p-4`); kartin kendisi yalnizca cam yuzeydir. */
  className?: string;
  /**
   * Kartin DIS yerlesimi (ör. yan yana kartlarda `flex-1`). Varsayilan bos: dikey bir sutunda `flex-1`
   * kartin boyunu cokertebilir, bu yuzden karar cagiranin.
   */
  disClassName?: string;
  children: React.ReactNode;
}

/**
 * Liquid Glass kart yuzeyi (#491; #547 -- ana sayfanin ozet kartlari ve arkadas karsilastirmasi). Yeni
 * kartlarin varsayilan yuzeyi (kullanici karari; gorsel tasarim spec'i Karar 9). Uc katman:
 * - gercek blur (`CamYuzey`; #491 kullanici karari -- Android'de duz perde, bilinen fark);
 * - ustten asagi sonen ince bir parilti (camin ustune dusen isik);
 * - sac teli kenar.
 *
 * Yari saydamlik yeni bir token DEGIL, mevcut `fg`'nin tam opak rengi + KATMANIN opakligi: `fg` koyu
 * temada acik, acik temada koyu oldugu icin parilti ve kenar iki temada da kendiliginden dogru tonu alir.
 * Tailwind'in hazir paleti (`white/10` gibi) kullanilmaz; `border-fg/10` gibi ekler de kullanilmaz
 * (degiskene bagli renkte calismiyor, kenar siyah cikiyordu).
 */
export default function CamKart({
  onPress,
  accessibilityLabel,
  className = '',
  disClassName = '',
  children,
}: Props) {
  const palet = useRenkPaleti();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      className={`overflow-hidden rounded-3xl ${disClassName}`}
    >
      <CamYuzey />
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
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
      <View pointerEvents="none" className="absolute inset-0 rounded-3xl border border-fg opacity-10" />
      <View className={className}>{children}</View>
    </Pressable>
  );
}
