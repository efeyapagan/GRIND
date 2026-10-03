import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useEtkinTema } from '../ui/renkler';
import { useKlavyeYuksekligi } from '../ui/useKlavyeYuksekligi';

interface Props {
  /** Perdeye dokununca (ve icerigin kendi kapatma yollarinda) cagrilir. */
  onKapat: () => void;
  /** Icerik degisince (menu -> duzenleyici) acilis animasyonu yeniden oynasin diye. */
  icerikAnahtari: string;
  children: React.ReactNode;
}

/** Antrenman ekranindaki set duzenleyicinin acilisi (#396) gibi: hafif kucukten, ayni yayla buyur. */
const ACILIS = ZoomIn.springify().damping(14).stiffness(180).mass(0.8).withInitialValues({ transform: [{ scale: 0.92 }] });
const KAPANIS = FadeOut.duration(150);

/**
 * #564: gecmis detay panelinin USTUNDE acilan katman -- set menusu, set duzenleyici ve set ekleme
 * formu ayni yerde durur. Gecmis paneli bir `Modal` oldugu icin ikinci bir `Modal` acilmaz; katman
 * ayni pencerede cizilir. Perde antrenman ekraninin odak katmaniyla ayni; icerik klavyenin (iOS)
 * ustunde kalan alana ortalanir.
 */
export default function GecmisKatmani({ onKapat, icerikAnahtari, children }: Props) {
  const { t } = useTranslation();
  const etkinTema = useEtkinTema();
  const klavyeYuksekligi = useKlavyeYuksekligi();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(150)} exiting={KAPANIS} style={StyleSheet.absoluteFill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('gecmis.setKatmaniniKapat')}
          onPress={onKapat}
          className={`flex-1 ${etkinTema === 'acik' ? 'bg-black/20' : 'bg-black/40'}`}
        />
      </Animated.View>
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { paddingBottom: klavyeYuksekligi }]}
        className="justify-center px-4"
      >
        <Animated.View key={icerikAnahtari} entering={ACILIS} exiting={KAPANIS}>
          {children}
        </Animated.View>
      </View>
    </View>
  );
}
