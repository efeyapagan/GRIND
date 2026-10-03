import { View, Pressable } from 'react-native';
import CamKatmanlari from './CamKatmanlari';

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
 * kartlarin varsayilan yuzeyi (kullanici karari; gorsel tasarim spec'i Karar 9). Uc katman (`CamKatmanlari`):
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
      <CamKatmanlari vurguluKenar={vurguluKenar} />
      <View className={className}>{children}</View>
    </Pressable>
  );
}
