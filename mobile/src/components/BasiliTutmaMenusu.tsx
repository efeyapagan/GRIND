import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import CamKatmanlari from '../ui/CamKatmanlari';
import { ACILIS_YAYI } from '../ui/KabukTabBar';
import { useEtkinTema } from '../ui/renkler';
import DuzenleSilSecenekleri from './DuzenleSilSecenekleri';

/** Kartin ekrandaki kutusu (`measureInWindow`). */
export interface Kutu {
  x: number;
  y: number;
  genislik: number;
  /** Olculmusse kartin yuksekligi (olcu karti gibi degisken boylu kartlar icin). */
  yukseklik?: number;
}

interface Props {
  /** Karuseldeki / listedeki kartin genisligi -- onizleme ayni kartin buyutulmus halidir. */
  kartGenisligi: number;
  kartYuksekligi: number;
  /** Kartin ekrandaki yeri; olculemediyse `null` (onizleme ortada belirir). */
  kaynak: Kutu | null;
  /** Kapanis animasyonu bittikten sonra cagrilir; menuyu kaldirmak cagiranin isidir. */
  onKapat: () => void;
  onDuzenle: () => void;
  onSil: () => void;
  duzenleEtiketi: string;
  silEtiketi: string;
  silOnayMesaji: string;
  testID?: string;
  /** Kartin kendisi: `kartGenisligi` x `kartYuksekligi` kutusunda cizilir, buyutulup perdeye dokunmaz. */
  children: React.ReactNode;
}

const EN_BUYUK_OLCEK = 1.15;
const YATAY_BOSLUK = 16;
const PANEL_ARALIGI = 16;
/** Panel olculene kadarki tahmini yukseklik (iki satir + bosluklar); yalnizca ilk karede kullanilir. */
const TAHMINI_PANEL = 128;
const KAPANIS_MS = 200;
/** `measureInWindow` bu surede donmezse onizleme olcumsuz (ortadan) acilir. */
const OLCUM_BEKLEME_MS = 80;

/**
 * #439/#623: basili tutunca acilan menu -- iOS baglam menusu gibi; sablon karti ve olcu karti AYNI bileseni
 * kullanir (kullanici karari: menu animasyonu standart). Kart listedeki YERINDEN kalkip ekranin ortasina
 * dogru buyur (`ACILIS_YAYI`, alt menu balonu ve gecmis paneliyle ayni yay), arka plan kararir ama gorunur
 * kalir, kartin altinda cam (#590 ile uc katmanli `CamKatmanlari`) bir panelde Duzenle / Sil belirir. Sil
 * geri alinamaz: panel yerinde onay sorar. Kapanis ayni yolu geri sarar.
 *
 * Onizleme kartin buyutulmus halidir (ayni genislikte cizilip `scale` edilir): icerik yeniden
 * dizilmez, buyurken ziplamaz. Dokunmayi almaz -- ustune dokunmak da perdeye gider ve menuyu kapatir.
 */
export default function BasiliTutmaMenusu({
  kartGenisligi,
  kartYuksekligi,
  kaynak,
  onKapat,
  onDuzenle,
  onSil,
  duzenleEtiketi,
  silEtiketi,
  silOnayMesaji,
  testID = 'basili-tutma-menusu',
  children,
}: Props) {
  const { t } = useTranslation();
  const etkinTema = useEtkinTema();
  const { width: ekranG, height: ekranY } = useWindowDimensions();
  // Panel yuksekligi ILK olcumde sabitlenir: silme onayina gecince panel uzar ama kart yerinden oynamaz.
  const [panelYuksekligi, setPanelYuksekligi] = useState<number | null>(null);
  // Acilisin hangi kutudan basladigi BIR KEZ sabitlenir: olcum gec gelirse kart yolun ortasinda sicramasin.
  const [baslangic, setBaslangic] = useState<Kutu | null | undefined>(undefined);
  const ilerleme = useSharedValue(0);
  const kapaniyor = useRef(false);

  useEffect(() => {
    if (baslangic !== undefined) {
      return;
    }
    if (kaynak) {
      setBaslangic(kaynak);
      return;
    }
    const zamanlayici = setTimeout(() => setBaslangic(null), OLCUM_BEKLEME_MS);
    return () => clearTimeout(zamanlayici);
  }, [kaynak, baslangic]);

  // Acilis kartin kalkacagi kutu VE panelin boyu bilinince baslar; o ana kadar onizleme tam kartin
  // ustunde durur, panel gorunmez.
  const basladi = baslangic !== undefined && panelYuksekligi !== null;
  useEffect(() => {
    if (basladi) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      ilerleme.value = withSpring(1, ACILIS_YAYI);
    }
  }, [basladi, ilerleme]);

  const olcek = Math.min(EN_BUYUK_OLCEK, (ekranG - 2 * YATAY_BOSLUK) / kartGenisligi);
  const buyukG = kartGenisligi * olcek;
  const buyukY = kartYuksekligi * olcek;
  // Buyumus kart + panel ekranda dikeyde ortalanir.
  const hedefUst = Math.max(YATAY_BOSLUK, (ekranY - (buyukY + PANEL_ARALIGI + (panelYuksekligi ?? TAHMINI_PANEL))) / 2);
  const hedefMerkezX = ekranG / 2;
  const hedefMerkezY = hedefUst + buyukY / 2;
  const kaymaX = baslangic ? baslangic.x + kartGenisligi / 2 - hedefMerkezX : 0;
  const kaymaY = baslangic ? baslangic.y + kartYuksekligi / 2 - hedefMerkezY : 0;
  const ilkOlcek = baslangic ? 1 : olcek * 0.9;

  const kartStili = useAnimatedStyle(() => ({
    opacity: baslangic ? 1 : interpolate(ilerleme.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(ilerleme.value, [0, 1], [kaymaX, 0]) },
      { translateY: interpolate(ilerleme.value, [0, 1], [kaymaY, 0]) },
      { scale: interpolate(ilerleme.value, [0, 1], [ilkOlcek, olcek]) },
    ],
  }));
  const panelStili = useAnimatedStyle(() => ({
    opacity: interpolate(ilerleme.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(ilerleme.value, [0.5, 1], [12, 0], Extrapolation.CLAMP) }],
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
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => kapat(onKapat)}>
      <Animated.View style={[StyleSheet.absoluteFill, perdeStili]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ortak.kapat')}
          onPress={() => kapat(onKapat)}
          // Arka plan karartilir ama secilebilir kalir; acik temada karartma daha hafif (#271).
          className={`flex-1 ${etkinTema === 'acik' ? 'bg-black/30' : 'bg-black/60'}`}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          {
            position: 'absolute',
            left: (ekranG - kartGenisligi) / 2,
            // Olcek merkezden uygulanir: olceksiz kutu, buyumus kartin merkezine hizalanir.
            top: hedefMerkezY - kartYuksekligi / 2,
          },
          kartStili,
        ]}
      >
        <View style={{ width: kartGenisligi, height: kartYuksekligi }}>{children}</View>
      </Animated.View>

      <Animated.View
        testID={testID}
        onLayout={(olay) => {
          const yukseklik = olay.nativeEvent.layout.height;
          setPanelYuksekligi((onceki) => onceki ?? yukseklik);
        }}
        className="overflow-hidden rounded-2xl"
        style={[
          { position: 'absolute', left: (ekranG - buyukG) / 2, width: buyukG, top: hedefUst + buyukY + PANEL_ARALIGI },
          panelStili,
        ]}
      >
        <CamKatmanlari koseSinifi="rounded-2xl" />
        <DuzenleSilSecenekleri
          duzenleEtiketi={duzenleEtiketi}
          silEtiketi={silEtiketi}
          silOnayMesaji={silOnayMesaji}
          onDuzenle={() => kapat(onDuzenle)}
          onSil={() => kapat(onSil)}
        />
      </Animated.View>
    </Modal>
  );
}
