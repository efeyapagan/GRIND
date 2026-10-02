import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import CamYuzey from './CamYuzey';
import { useRenkPaleti } from './renkler';

interface Props {
  onPress?: () => void;
  /** Dokunulabilir kartin erisilebilir adi (ör. yalnizca ikondan olusan cam dugme). */
  accessibilityLabel?: string;
  testID?: string;
  /** Kartin ic duzeni (ör. `flex-row gap-3 p-4`); kartin kendisi yalnizca cam yuzeydir. */
  className?: string;
  /**
   * Kartin DIS yerlesimi (ör. yan yana kartlarda `flex-1`). Varsayilan bos: dikey bir sutunda `flex-1`
   * kartin boyunu cokertebilir, bu yuzden karar cagiranin.
   */
  disClassName?: string;
  /**
   * #559 (sablon formu liquid glass donusumu): surukleme/odak gibi durumlarda varsayilan soluk
   * (`fg` opacity-10) sac teli kenarligin yerine belirgin, TAM opak `accent` kenarlik cizilir --
   * `SablonKarti`/`HareketKartlari`daki `border-accent` vurgusuyla ayni fikir, cam yuzeyde de.
   */
  vurguluKenar?: boolean;
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
 *
 * #559 (kullanici bildirdi -- sablon formunda hareket seciminin asagi acilan listesi "cok kucuk,
 * hicbir sey gozukmuyor" hale geldi): `overflow-hidden` DAHA ONCE EN DISTAKI Pressable'daydi, yani
 * TUM `children` agacini kirpiyordu -- `HareketSecici`nin kartin ALTINA tasmasi gereken acilir listesi
 * de dahil (o liste `position: absolute` ile kartin disina cizilmek UZERE tasarlanir). Kirpma artik
 * yalnizca cam GORUNTU katmanlarini (blur + parilti + kenar) saran AYRI, mutlak konumlu bir sarmalayicida;
 * disaridaki Pressable ve `children` artik kirpilmiyor, kartin disina tasan icerik (acilir listeler,
 * rozetler) serbestce gorunur. Gorsel sonuc AYNI (cam katmanlari yine ayni yuvarlak kosede kirpiliyor).
 */
export default function CamKart({
  onPress,
  accessibilityLabel,
  testID,
  className = '',
  disClassName = '',
  vurguluKenar = false,
  children,
}: Props) {
  const palet = useRenkPaleti();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      disabled={!onPress}
      onPress={onPress}
      className={`rounded-3xl ${disClassName}`}
    >
      {/* Cam GORUNTU katmanlari: bunlar yuvarlak koseye kirpilmeli, `children` KIRPILMAMALI. */}
      <View pointerEvents="none" className="absolute inset-0 overflow-hidden rounded-3xl">
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
        <View
          className={`absolute inset-0 rounded-3xl border ${vurguluKenar ? 'border-2 border-accent' : 'border-fg opacity-10'}`}
        />
      </View>
      <View className={className}>{children}</View>
    </Pressable>
  );
}
