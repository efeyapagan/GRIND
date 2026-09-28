import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useRenkPaleti } from './renkler';

const CIZGI_YUKSEKLIGI = 10;
/**
 * Cizgi metnin hemen altinda baslar; yerlesime girmedigi icin bu bosluk stille verilir.
 * 2 px iken Turkce alt kuyruklar ("ş", "ğ") cizgiye DEGIYORDU (#502, simulatorde gorunur).
 */
const CIZGI_BOSLUGU = 5;
const CIZIM_SURESI_MS = 1200;

/**
 * #439: altini kavisli `accent` bir cizgiyle cizen sayfa basligi. Ekrana her girildiginde cizgi
 * soldan saga yavasca "cizilir": cizgi baslik genisliginde bir kez cizilir, uzerindeki pencere
 * 0'dan tam genislige acilir. Cihazda "hareketi azalt" aciksa (`ReduceMotion.System`) cizgi
 * dogrudan tam gorunur.
 *
 * #499 (iki kullanici bildirimi, ikisi de bu bilesende bulusuyor):
 * - **Cizgi YERLESIME GIRMEZ** (`absolute`, metnin altina asilir). Once metin + bosluk + cizgi
 *   tek bir sutundu ve bar bu blogu ortaliyordu: baslik metni digger sekmelerin basligindan
 *   YUKARIDA duruyordu ("cok yukarida"). Artik bilesenin yuksekligi metin kadardir, yani bar
 *   METNI ortalar -- Ana sayfa basligiyla ayni hiza.
 * - **Olcum METNE BAGLIDIR.** Yalnizca genisligi state'te tutmak, baslik degisince (antrenman
 *   baslayinca "Antrenmana basla" -> "Antrenman") cizgiyi ESKI uzunlukta birakiyordu: RN metin
 *   degisince `onLayout`u her zaman tetiklemiyor ve sifirlama ile olay arasindaki sira garanti
 *   degil. Olcum hangi metne ait oldugunu tasir; baska bir metne ait olcum yok sayilir, yani
 *   cizgi ya DOGRU uzunlukta cizilir ya hic cizilmez -- yanlis uzunlukta asla.
 *
 * #502 (kullanici bildirdi, #499'un iki yan etkisi):
 * - Cizginin konumu YUZDE degil, olculen metin YUKSEKLIGI. `top: '100%'` React Native'de metin
 *   kutusunun altina degil ~35 pt asagiya dusuyordu: cizgi baslikla sayfanin ilk basligi
 *   arasindaki bosluga kaciyor, alti cizili bir baslik yerine basibos bir cizgi gibi duruyordu.
 *   Olcum zaten `onLayout`tan geliyor; yukseklik de ayni olaydan alinir, ikinci bir kaynak yok.
 * - Kokteki `self-start` KALKTI: saran barin `items-center`'ini eziyor ve basligi barin TEPESINE
 *   yapistiriyordu (sagdaki GRIND ortada kaldigi icin ikisi hizasizdi). Cizgi zaten yerlesimin
 *   disinda oldugu icin kokun yuksekligi metin kadardir; ortalama dogrudan metni ortalar.
 */
export default function CizgiliBaslik({ children }: { children: string }) {
  const palet = useRenkPaleti();
  const [olcum, setOlcum] = useState<{ metin: string; genislik: number; yukseklik: number } | null>(null);
  const ilerleme = useSharedValue(0);
  const gecerli = olcum?.metin === children ? olcum : null;
  const genislik = gecerli?.genislik ?? 0;

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
    <View className="flex-col">
      <Text
        // Metin degisince yeniden monte olur: taze bir `onLayout` garanti edilir.
        key={children}
        accessibilityRole="header"
        className="text-title font-bold text-fg"
        onLayout={({ nativeEvent: { layout } }) =>
          setOlcum({ metin: children, genislik: layout.width, yukseklik: layout.height })
        }
      >
        {children}
      </Text>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="absolute left-0 overflow-hidden"
        style={[{ top: (gecerli?.yukseklik ?? 0) + CIZGI_BOSLUGU, height: CIZGI_YUKSEKLIGI }, pencere]}
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
