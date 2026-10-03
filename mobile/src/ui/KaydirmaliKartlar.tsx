import { Children, useState, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

/** Ebeveynin yan boslugu (`px-4`): kaydirici ekran kenarina kadar uzanir, bosluk her sayfanin icine girer. */
const YAN_BOSLUK = 16;
const NOKTA = 6;
/** Etkin nokta daireden hapa uzar (Instagram'daki coklu gonderi gostergesi gibi). */
const ETKIN_NOKTA = 18;
const SONUK_OPAKLIK = 0.3;
const KARE_MS = 16;

/**
 * #631: Instagram'daki coklu gonderi gibi yana kayan kartlar -- sola kaydirinca sonraki, saga kaydirinca
 * onceki sayfa. Kaydirma parmagi izler ve birakinca hizina gore sayfaya oturur (`pagingEnabled`, yerel).
 *
 * Kaydirici ekran genisligindedir (`-16` yan kenar), her sayfa kendi 16'lik yan boslugunu tasir: kartlar
 * kayarken aralarinda 32 birim kalir ve oturunca ekrandaki yerleri digerleriyle hizali olur.
 *
 * Yatay kaydiricinin satiri en uzun sayfanin boyunu alir ve sayfalar o boya gerilir; karti da gerilsin
 * diye cagiran ona `flex-1` verir. Boylece sayfa degisince altindaki icerik yukari asagi ziplamaz.
 *
 * Noktalar kaydirma konumunu UI thread'inde izler (sayfa degisince degil, kaydirma boyunca akarak);
 * erisilebilir etiket JS'te, yalnizca kaydirma bir sayfaya oturunca guncellenir.
 */
export default function KaydirmaliKartlar({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { width: ekranGenisligi } = useWindowDimensions();
  const [genislik, setGenislik] = useState(ekranGenisligi);
  const [etkin, setEtkin] = useState(0);
  const kaydirma = useSharedValue(0);
  const sayfalar = Children.toArray(children);

  const kaydirildi = useAnimatedScrollHandler((olay) => {
    kaydirma.value = olay.contentOffset.x;
  });

  return (
    <View className="gap-3">
      <Animated.ScrollView
        testID="kaydirmali-kartlar"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={KARE_MS}
        onScroll={kaydirildi}
        onLayout={(olay) => setGenislik(olay.nativeEvent.layout.width)}
        onMomentumScrollEnd={(olay) => {
          const yeni = Math.round(olay.nativeEvent.contentOffset.x / genislik);
          setEtkin(Math.min(sayfalar.length - 1, Math.max(0, yeni)));
        }}
        style={{ marginHorizontal: -YAN_BOSLUK }}
      >
        {sayfalar.map((sayfa, indeks) => (
          <View key={indeks} style={{ width: genislik, paddingHorizontal: YAN_BOSLUK }}>
            {sayfa}
          </View>
        ))}
      </Animated.ScrollView>
      <View
        accessible
        accessibilityLabel={t('ortak.sayfaGostergesi', { no: etkin + 1, toplam: sayfalar.length })}
        className="flex-row items-center justify-center"
        style={{ gap: NOKTA }}
      >
        {sayfalar.map((_, indeks) => (
          <Nokta key={indeks} indeks={indeks} kaydirma={kaydirma} genislik={genislik} />
        ))}
      </View>
    </View>
  );
}

function Nokta({ indeks, kaydirma, genislik }: { indeks: number; kaydirma: SharedValue<number>; genislik: number }) {
  const stil = useAnimatedStyle(() => {
    // 0 = bu sayfa tam ekranda, 1 = bir sayfa (ya da daha fazla) uzakta.
    const uzaklik = Math.min(1, Math.abs(kaydirma.value / genislik - indeks));
    return {
      width: interpolate(uzaklik, [0, 1], [ETKIN_NOKTA, NOKTA]),
      opacity: interpolate(uzaklik, [0, 1], [1, SONUK_OPAKLIK]),
    };
  });
  return <Animated.View className="rounded-full bg-fg" style={[{ height: NOKTA }, stil]} />;
}
