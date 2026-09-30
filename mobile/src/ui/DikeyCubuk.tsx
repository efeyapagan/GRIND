import { View } from 'react-native';
import { useAccentParlama } from './renkler';

interface Props {
  testID: string;
  /** Dolu kisim, 0..1. `null` = karsilastirilacak bir sey yok: kanal durur, dolmaz. */
  oran: number | null;
  /** Erisilebilirlik agacindaki deger (ekran okuyucu "3 / 8" okur). */
  deger?: { min: number; max: number; now: number };
}

/**
 * Ozet kartlarinin sagindaki dikey cubuk (#544, kullanici karari -- Apple Saglik'in olcum kartlari):
 * cukur bir hap (`inset`) icinde ince bir ray, alttan dolan `accent` kisim ve ucunda hafif parlayan
 * bir halka. Rayin ust ve altindaki kisa cizgiler olcegin uclarini gosterir.
 *
 * Yuzdeler `style` ile verilir: dolu kismin boyu ve halkanin konumu calisma aninda hesaplanan
 * degerlerdir (ArkadasSatiri'ndaki ilerleme cubuguyla ayni gerekce).
 */
export default function DikeyCubuk({ testID, oran, deger }: Props) {
  const parlama = useAccentParlama();
  const yuzde = oran === null ? null : `${Math.round(oran * 100)}%` as const;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={deger}
      className="w-9 items-center self-stretch rounded-full bg-inset py-2"
    >
      <View className="h-1 w-2 rounded-full bg-surface-4" />
      <View className="my-1 w-2 flex-1 rounded-full bg-surface-4">
        {yuzde !== null && oran !== null && (
          <>
            {/* Rayin dibinden halka alaninin baslangicina kadar olan parca: dolu kisim rayin DIBINDEN
                baslar (yoksa tam dolu cubuk bile altinda gri bir bosluk birakip eksik gorunuyordu). */}
            {oran > 0 && <View className="absolute bottom-0 h-2 w-2 rounded-b-full bg-accent" />}
            {/* Halka ve dolu kismin ucu, rayin iki ucundan halkanin YARISI kadar iceride baslayan ortak
                bir alanda durur: %0'da da %100'de de halka rayin icinde kalir, uc cizgilerini ortmez. */}
            <View className="absolute inset-x-0 bottom-2 top-2 justify-end">
              <View testID={`${testID}-dolu`} className="w-2 rounded-t-full bg-accent" style={{ height: yuzde }} />
              <View
                pointerEvents="none"
                className="absolute -left-1 size-4 rounded-full border-2 border-fg bg-inset"
                style={[{ bottom: yuzde, marginBottom: -8 }, parlama]}
              />
            </View>
          </>
        )}
      </View>
      <View className="h-1 w-2 rounded-full bg-surface-4" />
    </View>
  );
}
