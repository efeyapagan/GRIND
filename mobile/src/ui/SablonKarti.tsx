import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Equal, Pencil } from 'lucide-react-native';
import { useIkonRenk } from './renkler';

interface Props {
  ad: string;
  hareketSayisi: number;
  onPress: () => void;
  disabled?: boolean;
  /** #344: surukleme sirasinda kart parmagin altinda "kalkik" durur (kenarlik + golge). */
  kaldirilmis?: boolean;
}

/**
 * web/src/ui/SablonKarti.tsx ile ayni: sablon ozeti karti. #439'dan beri yalnizca "Şablonları
 * yönet" listesinde (antrenman ekraninda `SablonVitrinKarti` var); orada surukleyerek siralandigi
 * icin `Link` degil `onPress` alir.
 *
 * #466 (kullanici karari): solda iki cizgi (siralanabildigini GOSTERIR -- surukleme #344'ten beri
 * vardi ama gorunur bir tutamagi yoktu), sagda ok yerine KALEM. Ikonlar kutusuzdur: satira
 * dokunmak sablonu duzenlemeye goturur, ok "ileri git" diyordu ve yanlis bekleti yaratiyordu.
 */
export default function SablonKarti({ ad, hareketSayisi, onPress, disabled, kaldirilmis }: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  // Kenarlik SURUKLENMESE DE hep cizilir, yalnizca RENGI degisir (#261 tuzagi: ilk cizimden
  // SONRA yeni bir sinif eklemek NativeWind'i bileseni "yukseltmeye" zorluyor ve navigasyon
  // baglaminda cokuyor). Ayni sebeple kalkik kart icin golge sinifi eklenmiyor.
  const kenarlik = kaldirilmis ? 'border-accent' : 'border-transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`min-h-16 w-full flex-row items-center gap-3 rounded-xl border bg-surface-2 p-4 ${kenarlik} ${disabled ? 'opacity-60' : ''}`}
    >
      {/* Lucide SVG'leri `accessibilityLabel`i iletmez; etiket saran View'da durur. */}
      <View testID="sablon-tutamak" accessible accessibilityLabel={t('sablonlar.surukleyipSirala')}>
        <Equal color={ikonRenk.muted} size={20} />
      </View>

      <View className="min-w-0 flex-1 flex-col gap-1">
        <Text numberOfLines={1} className="text-body-lg font-semibold text-fg">
          {ad}
        </Text>
        <Text className="text-label text-muted">{t('sablonlar.hareketSayisi', { count: hareketSayisi })}</Text>
      </View>

      <View testID="sablon-duzenle-ikonu" accessible accessibilityLabel={t('sablonlar.sablonuDuzenle')}>
        <Pencil color={ikonRenk.muted} size={20} />
      </View>
    </Pressable>
  );
}
