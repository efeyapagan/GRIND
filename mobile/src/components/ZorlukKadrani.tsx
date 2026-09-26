import { useEffect, useRef } from 'react';
import { View, Text, Pressable, PanResponder, type GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import type { Zorluk } from '@grind/shared/api/queries';

import {
  altDurakDerinligi,
  durakKonumu,
  kadranTitresimi,
  yayKonumu,
  yayYolu,
  ZORLUK_KADEMELERI,
  type KadranTitresimi,
} from '@grind/shared/lib/zorlukKadrani';
import { useRenkPaleti } from '../ui/renkler';

/**
 * #388 "tiiiirt": duraklar arasinda alt menunun (#379) hafif tiki, secim bir duraga oturunca tok
 * (`Heavy`) bir vurus.
 */
function titret(tur: KadranTitresimi) {
  if (tur === 'tok') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } else if (tur === 'ince') {
    void Haptics.selectionAsync();
  }
}

interface Props {
  deger: Zorluk;
  onDegis: (zorluk: Zorluk) => void;
  /**
   * Parmakla cevirme basladi/bitti. Kadrani saran ekran kaydiriliyorsa bununla kaydirmayi kapatir:
   * iOS'ta ScrollView'un yerel kaydirma jesti aksi halde dikey hareketi calip cevirmeyi koparir.
   */
  onSurukleme?: (suruklemede: boolean) => void;
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
 * Renkler yalnizca tasarim token'larindan gelir: yayin basindan secili duraga kadar dolgu ve gecilen
 * duraklar `accent`, bulunulan durak soluk `accent/40` (spec Karar 2, #182 genislemesi);
 * gecilmemis duraklar `surface-4`te, yay zemini `surface-2`de durur.
 */
export default function ZorlukKadrani({ deger, onDegis, onSurukleme }: Props) {
  const palet = useRenkPaleti();
  const { t } = useTranslation();
  const seciliSira = Math.max(0, ZORLUK_KADEMELERI.indexOf(deger));
  const secili = ZORLUK_KADEMELERI[seciliSira];

  // PanResponder bir kez kurulur (her render'da yeniden kurmak suren jesti koparirdi), bu yuzden
  // guncel `onDegis`/`onSurukleme`ye ref uzerinden ulasir.
  const onDegisRef = useRef(onDegis);
  const onSuruklemeRef = useRef(onSurukleme);
  const seciliSiraRef = useRef(seciliSira);
  useEffect(() => {
    onDegisRef.current = onDegis;
    onSuruklemeRef.current = onSurukleme;
    seciliSiraRef.current = seciliSira;
  }, [onDegis, onSurukleme, seciliSira]);
  /** Parmagin son yay konumu (`yayKonumu`) -- titresim bir onceki konuma gore secilir (#388). */
  const konumRef = useRef(0);

  const kutuRef = useRef<View>(null);
  /** Kadranin penceredeki sol ust kosesi -- jest basinda olculur. */
  const kutuKonumuRef = useRef<{ x: number; y: number } | null>(null);

  const cevirmeRef = useRef(
    PanResponder.create({
      // Baslangic non-capture: tek dokunus once en icteki bilesene sorulur, duraklarin onPress'i
      // calisir. Hareket ise CAPTURE ile alinir -- parmak bir duraktan (ozellikle secili turuncu
      // toptan) baslayip kayarsa jest duragin elinden alinir (#182, telefonda bulundu).
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Surukleme surerken ne ScrollView ne baska bir jest onu koparabilir.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (olay: GestureResponderEvent) => {
        onSuruklemeRef.current?.(true);
        // Jest secili duraktan basliyormus gibi olculur: parmak baska bir duraga degerse ilk anda tok vurus.
        konumRef.current = seciliSiraRef.current;
        const { pageX, pageY } = olay.nativeEvent;
        kutuRef.current?.measureInWindow((x, y) => {
          kutuKonumuRef.current = { x, y };
          cevir(pageX, pageY);
        });
      },
      onPanResponderMove: (olay: GestureResponderEvent) => cevir(olay.nativeEvent.pageX, olay.nativeEvent.pageY),
      onPanResponderRelease: () => onSuruklemeRef.current?.(false),
      onPanResponderTerminate: () => onSuruklemeRef.current?.(false),
    }),
  );

  /**
   * Parmagin konumu PENCERE koordinatindan (pageX/Y) kadranin konumu cikarilarak hesaplanir:
   * `locationX/Y` parmagin ilk degdigi cocuga (ortadaki yazi, bir durak) goredir ve aciyi bozar.
   */
  function cevir(pageX: number, pageY: number) {
    const kutu = kutuKonumuRef.current;
    if (!kutu) {
      return;
    }
    const konum = yayKonumu(pageX - kutu.x - MERKEZ, pageY - kutu.y - MERKEZ);
    titret(kadranTitresimi(konumRef.current, konum));
    konumRef.current = konum;
    onDegisRef.current(ZORLUK_KADEMELERI[Math.round(konum)]);
  }

  function sirayiSec(sira: number) {
    if (sira >= 0 && sira < ZORLUK_KADEMELERI.length && sira !== seciliSira) {
      titret('tok');
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
      ref={kutuRef}
      style={{ width: GENISLIK, height: YUKSEKLIK }}
      {...cevirmeRef.current.panHandlers}
    >
      <Svg width={GENISLIK} height={YUKSEKLIK} style={{ position: 'absolute' }}>
        <Path
          d={yayYolu(MERKEZ, YAY_YARICAP)}
          fill="none"
          stroke={palet['surface-2']}
          strokeWidth={YAY_KALINLIK}
          strokeLinecap="round"
        />
        {/* Surat kadrani ibresi gibi: yayin basindan secili duraga kadar dolar (#182). */}
        {seciliSira > 0 && (
          <Path
            d={yayYolu(MERKEZ, YAY_YARICAP, seciliSira)}
            fill="none"
            stroke={palet.accent}
            strokeWidth={YAY_KALINLIK}
            strokeLinecap="round"
          />
        )}
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
        const gecildi = sira < seciliSira;
        const { x, y } = durakKonumu(sira, MERKEZ, YAY_YARICAP);
        // Gecilen durak tam accent, bulunulan durak soluk (#182, kullanici karari): zemin renginde dolu
        // top + ustunde `accent/40` -- yoksa yari saydam ton altindaki turuncu yayla karisip alacali gorunurdu.
        const dolgu = gecildi ? 'bg-accent' : seciliMi ? 'bg-bg' : 'bg-surface-4';
        const rakam = gecildi ? 'text-on-accent' : seciliMi ? 'text-fg' : 'text-muted';
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
            className={`items-center justify-center overflow-hidden rounded-full ${dolgu}`}
          >
            {seciliMi && <View className="absolute inset-0 bg-accent/40" />}
            <Text className={`text-body font-bold ${rakam}`}>
              {sira + 1}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
