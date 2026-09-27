import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
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
      className={`min-h-16 w-full flex-row items-center justify-between gap-4 rounded-xl border bg-surface-2 p-4 ${kenarlik} ${disabled ? 'opacity-60' : ''}`}
    >
      <View className="min-w-0 flex-1 flex-col gap-1">
        <Text numberOfLines={1} className="text-body-lg font-semibold text-fg">
          {ad}
        </Text>
        <Text className="text-label text-muted">{t('sablonlar.hareketSayisi', { count: hareketSayisi })}</Text>
      </View>
      <ChevronRight color={ikonRenk.muted} size={20} />
    </Pressable>
  );
}
