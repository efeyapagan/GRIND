import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { useIkonRenk } from './renkler';

// Ikon RENGI burada degil, bilesenin icinde cozulur: modul seviyesinde okunursa temaya gore
// degismez (#271 -- ilk denemede ikonlar acik temada koyu tema renginde kalmisti).
const TON = {
  dolu: { kutu: 'bg-accent', yazi: 'text-on-accent', ikon: 'onAccent' },
  acik: { kutu: 'bg-accent/20', yazi: 'text-accent-soft', ikon: 'accentSoft' },
} as const;

const GECILDI_OPAKLIK = 0.45;
const CIZGI_SURESI_MS = 350;

interface Props {
  children: React.ReactNode;
  ton?: keyof typeof TON;
  ikon?: LucideIcon;
  tamYuvarlak?: boolean;
  /** #401: sonradan gecilen rekor -- rozet soluklasir, ustune soldan saga gri bir cizgi cekilir.
   * Animasyon yalnizca deger DEGISINCE oynar; ilk cizimde gecilmis rozet dogrudan cizili gelir. */
  gecildi?: boolean;
}

/** Rozet: web'deki `uppercase` CSS'i karsiligi olarak metin burada elle buyuk harfe cevrilmez --
 * cagiran taraf zaten buyuk harfli metin geçiyor (RecordType gibi sabit degerler); tutarliligi
 * korumak icin `textTransform: 'uppercase'` stiliyle web'deki davranis birebir eslenir. */
export default function Rozet({ children, ton = 'dolu', ikon: Ikon, tamYuvarlak = false, gecildi = false }: Props) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const stil = TON[ton];
  // Cizgi gorsel bir isaret; ekran okuyucu ayni bilgiyi etiketten duyar (#404).
  const erisilebilirAd = gecildi && typeof children === 'string' ? `${children}, ${t('rekor.gecildi')}` : undefined;
  const ilerleme = useSharedValue(gecildi ? 1 : 0);

  useEffect(() => {
    ilerleme.value = withTiming(gecildi ? 1 : 0, { duration: CIZGI_SURESI_MS });
  }, [gecildi, ilerleme]);

  const kutuStili = useAnimatedStyle(() => ({ opacity: 1 - ilerleme.value * (1 - GECILDI_OPAKLIK) }));
  const cizgiStili = useAnimatedStyle(() => ({ width: `${ilerleme.value * 100}%` }));

  return (
    <Animated.View style={kutuStili} accessible={!!erisilebilirAd} accessibilityLabel={erisilebilirAd}>
      <View
        className={`flex-row items-center gap-1 px-2 py-0.5 ${stil.kutu} ${tamYuvarlak ? 'rounded-full' : 'rounded'}`}
      >
        {Ikon && <Ikon color={ikonRenk[stil.ikon]} size={12} />}
        <Text className={`text-label-xs uppercase ${stil.yazi}`}>{children}</Text>
      </View>
      <View pointerEvents="none" className="absolute inset-0 justify-center">
        <Animated.View className="h-0.5 rounded-full bg-muted" style={cizgiStili} />
      </View>
    </Animated.View>
  );
}
