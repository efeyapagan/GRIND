import { useRef } from 'react';
import { Modal, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  kaydirmaSinirla,
  kirpmaDikdortgeni,
  yakinlastirmaSinirla,
  type GorselBoyutu,
  type KirpmaDikdortgeni,
  type KirpmaKonumu,
} from '@grind/shared/lib/fotografKirpma';
import BirincilDugme from '../ui/BirincilDugme';
import CamIkincilDugme from '../ui/CamIkincilDugme';

/** Kare cercevenin ekran kenarlarindan payi (her yanda). */
const KENAR_PAYI = 16;
const OTURMA_MS = 150;

interface Props {
  gorsel: GorselBoyutu & { uri: string };
  onKullan: (alan: KirpmaDikdortgeni) => void;
  onVazgec: () => void;
}

/**
 * #565 (kullanici karari: kirpma alanini kullanici secer): iOS'un yerlesik kirpma ekrani yerine
 * uygulamanin kendi kirpma ekrani. Gorsel kare cerceveyi doldurur; iki parmakla yakinlastirilir,
 * surukleyerek konumlanir. Sinirlar ve sonuc dikdortgeni `fotografKirpma`nin saf hesabindan gelir --
 * hareketler JS'te islenir (`runOnJS(true)`), boylece hesap tek yerde kalir.
 *
 * RN `Modal` uygulamanin `GestureHandlerRootView`unun DISINDA cizilir; hareketler icin kendi koku var.
 */
export default function FotografKirpici({ gorsel, onKullan, onVazgec }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cerceve = width - KENAR_PAYI * 2;
  const tabanOlcek = cerceve / Math.min(gorsel.genislik, gorsel.yukseklik);

  const konum = useRef<KirpmaKonumu>({ yakinlastirma: 1, x: 0, y: 0 });
  const baslangic = useRef<KirpmaKonumu>({ yakinlastirma: 1, x: 0, y: 0 });
  const yakinlastirma = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  function uygula(yeni: KirpmaKonumu, animasyonlu = false) {
    const sinirli = kaydirmaSinirla(gorsel, cerceve, yeni);
    konum.current = { yakinlastirma: yeni.yakinlastirma, ...sinirli };
    const ayarla = (deger: number) => (animasyonlu ? withTiming(deger, { duration: OTURMA_MS }) : deger);
    yakinlastirma.value = ayarla(yeni.yakinlastirma);
    x.value = ayarla(sinirli.x);
    y.value = ayarla(sinirli.y);
  }

  const sikistir = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      baslangic.current = konum.current;
    })
    .onUpdate((olay) => {
      uygula({ ...konum.current, yakinlastirma: yakinlastirmaSinirla(baslangic.current.yakinlastirma * olay.scale) });
    });
  const surukle = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      baslangic.current = konum.current;
    })
    .onUpdate((olay) => {
      uygula({
        yakinlastirma: konum.current.yakinlastirma,
        x: baslangic.current.x + olay.translationX,
        y: baslangic.current.y + olay.translationY,
      });
    })
    .onEnd(() => uygula(konum.current, true));

  const gorselStili = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: yakinlastirma.value }],
  }));

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onVazgec}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          testID="fotograf-kirpici"
          className="flex-1 bg-bg px-4"
          style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
        >
          <Text className="text-heading text-fg">{t('profil.kirpmaBaslik')}</Text>
          <Text className="mt-1 text-label text-muted">{t('profil.kirpmaIpucu')}</Text>

          <View className="flex-1 items-center justify-center">
            <GestureDetector gesture={Gesture.Simultaneous(sikistir, surukle)}>
              <View
                className="items-center justify-center overflow-hidden rounded-xl"
                style={{ width: cerceve, height: cerceve }}
              >
                <Animated.Image
                  testID="kirpilacak-gorsel"
                  source={{ uri: gorsel.uri }}
                  style={[
                    { width: gorsel.genislik * tabanOlcek, height: gorsel.yukseklik * tabanOlcek },
                    gorselStili,
                  ]}
                />
                {/* Profil fotografi dairede gosterilir: kare kirpilir ama dairenin disi soluk gorunur. */}
                <View
                  pointerEvents="none"
                  className="absolute inset-0 rounded-full border-2 border-fg opacity-60"
                />
              </View>
            </GestureDetector>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <CamIkincilDugme onPress={onVazgec}>{t('ortak.vazgec')}</CamIkincilDugme>
            </View>
            <View className="flex-1">
              <BirincilDugme
                yukseklik="buyuk"
                accessibilityRole="button"
                accessibilityLabel={t('profil.kirpmaKullan')}
                onPress={() => onKullan(kirpmaDikdortgeni(gorsel, cerceve, konum.current))}
              >
                <Text className="text-body-lg font-bold text-on-accent">{t('profil.kirpmaKullan')}</Text>
              </BirincilDugme>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
