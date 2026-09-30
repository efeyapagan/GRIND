import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useEtkinTema, useRenkPaleti } from './renkler';

/**
 * Alevin yukselecegi en ust nokta ve oturacagi yer: cubugun yuksekliginin orani (kullanici karari).
 * Ilk hali %35 / %20 idi; kullanici "kivilcim cok kucuk kalmis" dedi, %60 / %40'a cikti.
 */
const TEPE = 0.6;
const SABIT = 0.4;
/**
 * Cizimin kutusu cubuktan genis: alev rayin iki yanina tasar. %60'ta alevin boyu kutunun genisligine
 * takilmasin diye cizimin en-boy oranina (24:32) yetecek kadar genis.
 */
const GENISLIK = 32;
const HAREKET = { reduceMotion: ReduceMotion.System } as const;

/**
 * "Bu surecte alev zaten oynadi mi" -- uygulama SURECI basina bir kez (#547, kullanici karari:
 * "uygulama ilk acildiginda animasyon oynasin, sonra kapatilip acilana kadar cizim kalsin"). Modul
 * seviyesinde tutulur: ekrandan cikip donmek bileseni yeniden takar ama bu degeri sifirlamaz;
 * uygulama kapatilip acilinca modul yeniden yuklenir ve animasyon tekrar oynar.
 */
let oynadi = false;

function ilkKezMi(): boolean {
  if (oynadi) {
    return false;
  }
  oynadi = true;
  return true;
}

/** Yalnizca testler icin: bir sonraki takilisi "uygulamanin ilk acilisi" yapar. */
export function alevOturumunuSifirla() {
  oynadi = false;
}

/**
 * Seri cubugunun altindaki alev (#547): kullanici rekorunu her hafta tazeliyorken cizilir (bkz.
 * `rekordaMi`). Uygulamanin ilk acilisinda alttan cubugun %60'ina titreyerek yukselir, sonra %40'a
 * inip orada SABIT kalir. Cihazda "hareketi azalt" aciksa (`ReduceMotion.System`) dogrudan son
 * haliyle cizilir.
 *
 * Cubugu saran katmanin tamamini kaplar ve kendi yuksekligini olcer: alevin boyu cubugun boyuna
 * oranlidir. Renkler token'dan: dis govde `accent`, parlak cekirdek iki temada da ACIK kalsin diye
 * temanin en acik token'i (koyuda `fg`, acikta `inset`).
 */
export default function AlevCizimi({ testID }: { testID: string }) {
  const palet = useRenkPaleti();
  const tema = useEtkinTema();
  // Bayrak TEK bir baslaticida tuketilir (uygulama StrictMode kullanmiyor; baslatici bir kez calisir).
  const [oynat] = useState(ilkKezMi);
  const [yukseklik, setYukseklik] = useState(0);
  const boy = useSharedValue(oynat ? 0 : SABIT);
  const titreme = useSharedValue(1);

  useEffect(() => {
    if (!oynat) {
      return;
    }
    boy.value = withSequence(
      withTiming(TEPE, { duration: 900, easing: Easing.out(Easing.cubic), ...HAREKET }),
      withTiming(SABIT, { duration: 600, easing: Easing.inOut(Easing.quad), ...HAREKET }),
    );
    // Yukselirken hafif titreme; oturunca durur ("sabit kalsin").
    titreme.value = withSequence(
      withRepeat(
        withSequence(withTiming(0.9, { duration: 110, ...HAREKET }), withTiming(1.06, { duration: 110, ...HAREKET })),
        6,
        true,
      ),
      withTiming(1, { duration: 150, ...HAREKET }),
    );
  }, [oynat, boy, titreme]);

  const alevStili = useAnimatedStyle(
    () => ({ height: yukseklik * boy.value, transform: [{ scaleX: titreme.value }] }),
    [yukseklik],
  );
  const cekirdek = tema === 'acik' ? palet.inset : palet.fg;

  return (
    <View
      testID={testID}
      pointerEvents="none"
      onLayout={(olay) => setYukseklik(olay.nativeEvent.layout.height)}
      className="absolute inset-0 items-center"
    >
      <Animated.View
        testID={oynat ? 'alev-oynuyor' : 'alev-sabit'}
        className="absolute bottom-0"
        style={[{ width: GENISLIK, transformOrigin: 'bottom' }, alevStili]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 24 32" preserveAspectRatio="xMidYMax meet">
          <Defs>
            <LinearGradient id={`${testID}-govde`} x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={palet.accent} stopOpacity={1} />
              <Stop offset="1" stopColor={palet.accent} stopOpacity={0.75} />
            </LinearGradient>
            <LinearGradient id={`${testID}-cekirdek`} x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={cekirdek} stopOpacity={0.95} />
              <Stop offset="1" stopColor={cekirdek} stopOpacity={0.25} />
            </LinearGradient>
          </Defs>
          {/* Dis govde: ortasi yukari kivrilan bir dil ve soldan kucuk bir yan alev. */}
          <Path
            d="M12 0.8 C14.2 5.2 20 9.6 20 18.4 C20 25 16.6 30.4 12 31.2 C7.4 30.4 4 25 4 18.4 C4 14 6.2 11 8.2 8.8 C8.4 11.8 9.6 13.6 11.2 14.4 C10.6 9.8 10.8 5.2 12 0.8 Z"
            fill={`url(#${testID}-govde)`}
          />
          {/* Parlak cekirdek: alevin en sicak yeri dipte. */}
          <Path
            d="M12 13 C13.4 16.2 16 18.4 16 22.6 C16 26.4 14.2 29 12 29.6 C9.8 29 8 26.4 8 22.6 C8 20.2 9.2 18.6 10.4 17.4 C10.6 19 11.2 20 12 20.4 C11.6 18 11.6 15.4 12 13 Z"
            fill={`url(#${testID}-cekirdek)`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
