import { useEffect, useRef } from 'react';
import { View, Text, Pressable, PanResponder, type GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import type { Zorluk } from '@grind/shared/api/queries';
import { renkler } from '@grind/shared/designTokens';
import {
  altDurakDerinligi,
  durakKonumu,
  enYakinDurak,
  yayYolu,
  ZORLUK_KADEMELERI,
} from '@grind/shared/lib/zorlukKadrani';

interface Props {
  deger: Zorluk;
  onDegis: (zorluk: Zorluk) => void;
}

const GENISLIK = 280;
const MERKEZ = GENISLIK / 2;
const YAY_YARICAP = 112;
const YAY_KALINLIK = 22;
const DURAK_BOYUT = 44;
/** Yay alti acik: kutu, en alttaki duraklarin bittigi yerde biter (tam kare degil). */
const YUKSEKLIK = MERKEZ + altDurakDerinligi(YAY_YARICAP) + DURAK_BOYUT / 2 + 2;
/** Ortadaki ad + cumle blogunun yaklasik yarisi -- blok yayin merkezine oturur. */
const ORTA_BLOK_YARI_YUKSEKLIK = 32;

/**
 * Antrenman zorlugunun bes durakli surat kadrani (#153, #182'de tam halkadan alti acik 240°'lik
 * yaya dondu: 1 sol altta, 5 sag altta). Geometri web kadraniyla ORTAK (`lib/zorlukKadrani`).
 * Secim uc yoldan yapilabilir: yayi parmakla cevirmek, bir duraga dokunmak, ya da ekran okuyucunun
 * artir/azalt eylemi (`accessibilityRole="adjustable"`). Ucu de ayni fonksiyona baglanir (DRY).
 *
 * Kontrollu bilesen: secili kademeyi kendisi TUTMAZ, `deger` ile alir -- antrenmani bitiren ekran
 * hangi degeri gonderecegini tek yerden bilir.
 *
 * Renkler yalnizca tasarim token'larindan gelir; secili durak `accent` alir (gercek bir "secili"
 * hal oldugu icin `accent` kurali saglanir), digerleri `surface-4`te durur.
 */
export default function ZorlukKadrani({ deger, onDegis }: Props) {
  const { t } = useTranslation();
  const seciliSira = Math.max(0, ZORLUK_KADEMELERI.indexOf(deger));
  const secili = ZORLUK_KADEMELERI[seciliSira];

  // PanResponder bir kez kurulur (her render'da yeniden kurmak suren jesti koparirdi), bu yuzden
  // guncel `onDegis`e ref uzerinden ulasir.
  const onDegisRef = useRef(onDegis);
  useEffect(() => {
    onDegisRef.current = onDegis;
  }, [onDegis]);

  const cevirmeRef = useRef(
    PanResponder.create({
      // Yalnizca non-capture: dokunus once en icteki bilesene sorulur, boylece duraklarin kendi
      // onPress'i calismaya devam eder; yayin bos yerinden baslayan surukleme buraya duser.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (olay: GestureResponderEvent) => cevir(olay),
      onPanResponderMove: (olay: GestureResponderEvent) => cevir(olay),
    }),
  );

  function cevir(olay: GestureResponderEvent) {
    const { locationX, locationY } = olay.nativeEvent;
    onDegisRef.current(ZORLUK_KADEMELERI[enYakinDurak(locationX - MERKEZ, locationY - MERKEZ)]);
  }

  function sirayiSec(sira: number) {
    if (sira >= 0 && sira < ZORLUK_KADEMELERI.length && sira !== seciliSira) {
      onDegis(ZORLUK_KADEMELERI[sira]);
    }
  }

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('ortak.zorlukKadrani')}
      accessibilityValue={{
        min: 1,
        max: ZORLUK_KADEMELERI.length,
        now: seciliSira + 1,
        text: t(`ortak.zorluk.${secili}`),
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(olay) => {
        if (olay.nativeEvent.actionName === 'increment') {
          sirayiSec(seciliSira + 1);
        } else if (olay.nativeEvent.actionName === 'decrement') {
          sirayiSec(seciliSira - 1);
        }
      }}
      style={{ width: GENISLIK, height: YUKSEKLIK }}
      {...cevirmeRef.current.panHandlers}
    >
      <Svg width={GENISLIK} height={YUKSEKLIK} style={{ position: 'absolute' }}>
        <Path
          d={yayYolu(MERKEZ, YAY_YARICAP)}
          fill="none"
          stroke={renkler['surface-2']}
          strokeWidth={YAY_KALINLIK}
          strokeLinecap="round"
        />
      </Svg>

      <View
        style={{ position: 'absolute', left: 0, right: 0, top: MERKEZ - ORTA_BLOK_YARI_YUKSEKLIK }}
        className="items-center gap-1 px-14"
      >
        <Text className="text-heading font-bold text-fg">{t(`ortak.zorluk.${secili}`)}</Text>
        <Text className="text-center text-body text-muted">{t(`ortak.zorlukCumlesi.${secili}`)}</Text>
      </View>

      {ZORLUK_KADEMELERI.map((kademe, sira) => {
        const seciliMi = sira === seciliSira;
        const { x, y } = durakKonumu(sira, MERKEZ, YAY_YARICAP);
        return (
          <Pressable
            key={kademe}
            accessibilityRole="button"
            accessibilityLabel={t(`ortak.zorluk.${kademe}`)}
            accessibilityState={{ selected: seciliMi }}
            onPress={() => sirayiSec(sira)}
            style={{
              position: 'absolute',
              width: DURAK_BOYUT,
              height: DURAK_BOYUT,
              left: x - DURAK_BOYUT / 2,
              top: y - DURAK_BOYUT / 2,
            }}
            className={`items-center justify-center rounded-full ${seciliMi ? 'bg-accent' : 'bg-surface-4'}`}
          >
            <Text className={`text-body font-bold ${seciliMi ? 'text-on-accent' : 'text-muted'}`}>
              {sira + 1}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
