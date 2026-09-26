import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Trash2, X } from 'lucide-react-native';
import type { GecmisOturum } from '@grind/shared/api/queries';
import GecmisOzeti from './GecmisOzeti';
import SetList from './SetList';
import CamYuzey from '../ui/CamYuzey';
import IkonDugmesi from '../ui/IkonDugmesi';
import { ACILIS_YAYI, ALT_MENU_YUKSEKLIGI, altMenuAltKenari } from '../ui/KabukTabBar';
import { useEtkinTema, useIkonRenk } from '../ui/renkler';

/** Panel tam boyken ust kenarinin guvenli alanin altinda biraktigi bosluk. */
const UST_BOSLUK = 8;
/** Alt menunun `left-4 right-4`u: panel cubukla ayni genislikte dogar. */
const YATAY_BOSLUK = 16;
/** Tam boy panelin kose yaricapi -- odak karti gibi `rounded-xl`. */
const KART_YARICAPI = 12;
const KAPANIS_MS = 200;

interface Props {
  oturum: GecmisOturum;
  /** Kapanis animasyonu bittikten sonra cagrilir; paneli kaldirmak cagiranin isidir. */
  onKapat: () => void;
  /** Verilmezse panel salt-okunurdur (#284). Panel kapandiktan SONRA cagrilir -- onay kartta sorulur. */
  onSil?: () => void;
}

/**
 * #382: gecmis antrenmanin ayrintisi -- listedeki kart yerinde acilmak yerine bu cam panelde
 * (`CamYuzey`, antrenman ekranindaki set paneli/odak kartiyla ayni yuzey) gosterilir.
 *
 * Acilis "genisleyen alt menu": panel alt menu hapinin TAM yerinde ve boyunda (`ALT_MENU_YUKSEKLIGI`,
 * tam yuvarlak) dogar, alt menu balonunun yayiyla (`ACILIS_YAYI`) yukari dogru ekrani kaplar, koseleri
 * karta doner; icerik buyume sonuna dogru belirir. Kapanis ayni yolu kisaca geri sarar -- panel hapa
 * donup altindaki gercek alt menunun ustunde kaybolur.
 *
 * RN `Modal` icinde cizilir: kart bir `FlatList`in icinde durur, panelin profil basliginin ve alt
 * menunun da ustune cikmasi gerekir. Android geri tusu `onRequestClose` ile paneli kapatir.
 */
export default function GecmisDetayPaneli({ oturum, onKapat, onSil }: Props) {
  const ikonRenk = useIkonRenk();
  const etkinTema = useEtkinTema();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [alanYuksekligi, setAlanYuksekligi] = useState(0);
  const ilerleme = useSharedValue(0);
  const kapaniyor = useRef(false);

  const altKenar = altMenuAltKenari(insets.bottom);
  const tamYukseklik = Math.max(ALT_MENU_YUKSEKLIGI, alanYuksekligi - insets.top - UST_BOSLUK - altKenar);
  // Acilis ancak alan olculdukten sonra baslar: hedef yukseklik ondan once bilinmez.
  const olculdu = alanYuksekligi > 0;
  useEffect(() => {
    if (olculdu) {
      ilerleme.value = withSpring(1, ACILIS_YAYI);
    }
  }, [olculdu, ilerleme]);

  const panelStili = useAnimatedStyle(() => ({
    // Yay 1'i biraz asar: panel ust kenarda hafifce esneyip yerine oturur.
    height: interpolate(ilerleme.value, [0, 1], [ALT_MENU_YUKSEKLIGI, tamYukseklik]),
    borderRadius: interpolate(
      ilerleme.value,
      [0, 1],
      [ALT_MENU_YUKSEKLIGI / 2, KART_YARICAPI],
      Extrapolation.CLAMP,
    ),
  }));
  const icerikStili = useAnimatedStyle(() => ({
    opacity: interpolate(ilerleme.value, [0.6, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const perdeStili = useAnimatedStyle(() => ({
    opacity: interpolate(ilerleme.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  function kapat(sonra: () => void) {
    if (kapaniyor.current) {
      return;
    }
    kapaniyor.current = true;
    ilerleme.value = withTiming(0, { duration: KAPANIS_MS }, () => {
      runOnJS(sonra)();
    });
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => kapat(onKapat)}
    >
      <View className="flex-1" onLayout={(e) => setAlanYuksekligi(e.nativeEvent.layout.height)}>
        <Animated.View style={[StyleSheet.absoluteFill, perdeStili]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gecmis.detayiKapat')}
            onPress={() => kapat(onKapat)}
            // #271: antrenman ekranindaki odak katmaniyla ayni karartma.
            className={`flex-1 ${etkinTema === 'acik' ? 'bg-black/20' : 'bg-black/40'}`}
          />
        </Animated.View>
        <Animated.View
          testID="gecmis-detay-paneli"
          className="overflow-hidden border border-surface-4"
          style={[{ position: 'absolute', left: YATAY_BOSLUK, right: YATAY_BOSLUK, bottom: altKenar }, panelStili]}
        >
          <CamYuzey />
          {/* Icerik tam boy yuksekligindedir, buyuyen panel onu kirpar: buyume sirasinda satirlar
              yeniden dizilip ziplamaz. */}
          <Animated.View style={[{ height: tamYukseklik }, icerikStili]}>
            <View className="flex-row items-start gap-2 p-4 pb-0">
              <GecmisOzeti oturum={oturum} />
              <IkonDugmesi etiket={t('ortak.kapat')} onPress={() => kapat(onKapat)}>
                <X color={ikonRenk.muted} size={20} />
              </IkonDugmesi>
            </View>
            <ScrollView contentContainerClassName="flex-col gap-3 p-4">
              <SetList varyant="gecmis" sets={oturum.sets} bosDurumMetni={t('gecmis.bosDurumMetni')} />
              {onSil && (
                <Pressable
                  onPress={() => kapat(onSil)}
                  className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
                >
                  <Trash2 color={ikonRenk.danger} size={18} />
                  <Text className="text-label text-danger">{t('gecmis.antrenmaniSil')}</Text>
                </Pressable>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
