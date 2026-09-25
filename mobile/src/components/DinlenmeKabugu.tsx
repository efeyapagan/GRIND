import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Timer } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useOpenSession } from '@grind/shared/api/queries';
import { useRestTimerGorunumu } from '@grind/shared/restTimer';
import { useKalanSure } from '@grind/shared/useKalanSure';
import { EK_SURE_SN, sureEkle } from '@grind/shared/lib/dinlenme';
import { ikonRenk } from '../ui/renkler';

/**
 * Sure dolduktan sonra bitis isaretinin (ziplayan saat) ekranda kaldigi sure -- yalnizca kullanici
 * ANTRENMAN ekranindayken isler. Baska bir ekrandaysa isaret beklemeye devam eder ve antrenmana
 * DONULDUGU anda kalkar (kullanici karari): dinlenmenin bittigini kacirmasin.
 */
const BITTI_GORUNME_MS = 7000;
const KEEP_AWAKE_ETIKETI = 'dinlenme-sayaci';
/** Paneli kucultmek icin gereken yukari kaydirma mesafesi (px). */
const KAYDIRMA_ESIGI = 12;
const ANTRENMAN_YOLU = '/antrenman';

/**
 * web/src/components/DinlenmeKabugu.tsx ile ayni mantik: dinlenme sayaci antrenman sayfasinin
 * icinde degil ORTAK KABUKTA yasar ve uc hali vardir, ikisi ASLA ayni anda cizilmez:
 * - genis panel: YALNIZCA antrenman ekraninda; ust barin uzerine oturan, ondan ince bir serit.
 * - kucuk: panel yukari kaydirilinca (ya da antrenman disindaki her ekranda) ust barin ortasinda
 *   saat ikonu + kalan sure kalir (bkz. `DinlenmeGostergesi`).
 * - bitti: sure dolunca panel kalkar, yerini ziplayan saat ikonuna birakir.
 *
 * Ses (expo-audio), titresim ve ekrani acik tutma (expo-keep-awake) burada durur -- bilesen her
 * zaman monte oldugu icin sayac kucultulmusken de suresi dolunca bip calar.
 */
export default function DinlenmeKabugu() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { dinlenme, setDinlenme, genis, setGenis } = useRestTimerGorunumu();
  const { metin, bitti, oran } = useKalanSure(dinlenme);
  const calisiyor = dinlenme !== null && !bitti;
  const bipCalar = useAudioPlayer(require('../../assets/sounds/dinlenme-bitti.wav'));

  const antrenmandaMi = usePathname() === ANTRENMAN_YOLU;
  // Sure dolduğu ANDA kullanici antrenman ekraninda miydi? Iki temizleme kurali bununla ayrilir.
  const antrenmandaMiRef = useRef(antrenmandaMi);
  antrenmandaMiRef.current = antrenmandaMi;
  const bitisteAntrenmandaydi = useRef(false);

  // Bitis uyarisi; panel `bitti` ile zaten kalkar, geriye ziplayan saat kalir.
  useEffect(() => {
    if (!bitti) {
      return;
    }
    bitisteAntrenmandaydi.current = antrenmandaMiRef.current;
    Vibration.vibrate(400);
    void bipCalar.seekTo(0).then(() => bipCalar.play());
  }, [bitti, bipCalar]);

  // (1) Sure antrenman ekranindayken dolduysa: isaret birkac saniye durur, sonra kalkar.
  useEffect(() => {
    if (!bitti || !bitisteAntrenmandaydi.current) {
      return;
    }
    const zamanlayici = setTimeout(() => setDinlenme(null), BITTI_GORUNME_MS);
    return () => clearTimeout(zamanlayici);
  }, [bitti, setDinlenme]);

  // (2) Baska bir ekrandayken dolduysa: isaret bekler, antrenmana donulunce kalkar.
  useEffect(() => {
    if (!bitti || bitisteAntrenmandaydi.current || !antrenmandaMi) {
      return;
    }
    setDinlenme(null);
  }, [bitti, antrenmandaMi, setDinlenme]);

  // (3) #331: acik antrenman kalmadiysa (bitirildi/iptal edildi) sayac da kalkar. Oturumla bagi kuran
  // `useDinlenme` yalnizca antrenman ekraninda monte; bitirme ekranina gecince o ekran kapandigi icin
  // bu kural her zaman monte olan kabukta durur. Yalnizca sorgu "oturum yok" diye KESINLESINCE
  // temizlenir -- yuklenirken/hatada sayaca dokunulmaz.
  const { data: acikOturum, isSuccess: oturumBiliniyor } = useOpenSession();
  const oturumYok = oturumBiliniyor && !acikOturum;
  useEffect(() => {
    if (oturumYok && dinlenme) {
      setDinlenme(null);
    }
  }, [oturumYok, dinlenme, setDinlenme]);

  useEffect(() => {
    if (!calisiyor) {
      return;
    }
    void activateKeepAwakeAsync(KEEP_AWAKE_ETIKETI);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_ETIKETI);
    };
  }, [calisiyor]);

  const yukariKaydir = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY(-KAYDIRMA_ESIGI)
    .onEnd((olay) => {
      if (olay.translationY < -KAYDIRMA_ESIGI) {
        setGenis(false);
      }
    });

  if (!dinlenme || !genis || bitti || !antrenmandaMi) {
    return null;
  }

  return (
    <GestureDetector gesture={yukariKaydir}>
      {/* Ust barin uzerine oturur (ayni guvenli alan dolgusu), ondan ince bir serit olarak. */}
      <View style={{ paddingTop: insets.top }} className="absolute inset-x-0 top-0 z-50 bg-surface-2">
        <View className="relative h-12 flex-row items-center justify-between gap-2 px-4">
          <View className="min-w-0 flex-row items-center gap-2">
            <Timer color={ikonRenk.muted} size={18} />
            <Text className="text-metric text-fg">{metin}</Text>
          </View>
          <View className="shrink-0 flex-row items-center gap-1">
            <Pressable
              accessibilityRole="button"
              onPress={() => setDinlenme(sureEkle(dinlenme, EK_SURE_SN))}
              className="h-10 items-center justify-center rounded-lg bg-surface-3 px-3"
            >
              <Text className="text-label text-fg">{t('antrenman.dinlenmeEkleSure')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDinlenme(null)}
              className="h-10 items-center justify-center rounded-lg bg-surface-3 px-3"
            >
              <Text className="text-label text-fg">{t('ortak.atla')}</Text>
            </Pressable>
          </View>
          {/* Ilerleme barin en alt kenarinda ince bir cizgi: satir yuksekligini buyutmez. */}
          <View className="absolute inset-x-0 bottom-0 h-0.5 bg-surface-4">
            <View style={{ width: `${oran * 100}%` }} className="h-full bg-fg" />
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

/**
 * Ust barin ortasindaki kucuk hal: saat ikonu + kalan sure; sure dolunca yalnizca ziplayan saat
 * ikonu (temizlenmesini `DinlenmeKabugu` yonetir).
 *
 * Yalnizca ANTRENMAN ekraninda dokunulabilir (geri buyutur). Diger ekranlarda paneli acmanin
 * anlami yok -- oradaki "+15 sn"/"Atla" antrenmani yonetir -- o yuzden salt gosterge kalir
 * (kullanici karari: "ustune basilsa da buyumeyecek").
 */
export function DinlenmeGostergesi() {
  const { t } = useTranslation();
  const { dinlenme, genis, setGenis } = useRestTimerGorunumu();
  const { metin, bitti } = useKalanSure(dinlenme);
  const antrenmandaMi = usePathname() === ANTRENMAN_YOLU;

  // Panelin cizildigi tek durumda (antrenman ekrani + genis + surerken) burasi susar: iki gorunum
  // ayni anda gorunmez.
  if (!dinlenme || (antrenmandaMi && genis && !bitti)) {
    return null;
  }
  const icerik = bitti ? (
    <ZiplayanSaat />
  ) : (
    <>
      <Timer color={ikonRenk.fg} size={20} />
      <Text className="text-metric text-fg">{metin}</Text>
    </>
  );
  return (
    // `box-none`: yalnizca ortadaki gosterge dokunus alir, barin geri kalani (geri oku, ikonlar) serbest kalir.
    <View pointerEvents="box-none" className="absolute inset-0 items-center justify-center">
      {antrenmandaMi && !bitti ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('antrenman.dinlenmeGenislet')}
          onPress={() => setGenis(true)}
          className="min-h-11 flex-row items-center justify-center gap-1.5 rounded-lg px-2"
        >
          {icerik}
        </Pressable>
      ) : (
        <View pointerEvents="none" className="min-h-11 flex-row items-center justify-center gap-1.5 px-2">
          {icerik}
        </View>
      )}
    </View>
  );
}

/** Bitis isareti: web'deki `animate-bounce`in RN karsiligi. */
function ZiplayanSaat() {
  const kayma = useSharedValue(0);

  useEffect(() => {
    kayma.value = withRepeat(withSequence(withTiming(-6, { duration: 300 }), withTiming(0, { duration: 300 })), -1, false);
  }, [kayma]);

  const stil = useAnimatedStyle(() => ({ transform: [{ translateY: kayma.value }] }));

  return (
    <Animated.View style={stil}>
      <Timer color={ikonRenk.fg} size={22} />
    </Animated.View>
  );
}
