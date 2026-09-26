import { useEffect, useId, useRef, useState } from 'react';
import { View, Text, Pressable, PanResponder, Keyboard, type GestureResponderEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  enYakinRirDegeri,
  rirAciklamasi,
  rirDurakSirasi,
  rirEtiketi,
  RIR_DURAKLARI,
} from '@grind/shared/lib/rir';
import { useIkonRenk, useRenkPaleti } from '../ui/renkler';

interface Props {
  id: string;
  deger: number | null;
  onDegis: (rir: number | null) => void;
  /**
   * Set duzenleyicide `false`: sunucuda `PATCH` icin `null` "degistirme" demektir, RIR orada
   * bosaltilamaz -- Temizle sunmak yaniltirdi.
   */
  temizlenebilir?: boolean;
  hata?: string;
}

/** Ustte rakam yazan duraklar: tam sayilar ve "4+"; ara duraklar yalnizca nokta. */
const ETIKETLI = new Set([0, 1, 2, 3, 4, 5]);
const DURAK_BOYUT = 32;
const RAY_YUKSEKLIK = 12;
const ETIKET_GENISLIK = 32;

/**
 * web/src/components/RirAlani.tsx'in RN karsiligi (#266). Kapaliyken diger sayi alanlari gibi bir
 * kutu; dokununca klavye kapanir ve altinda on duraklik kaydirici acilir (0, 0–1, 1 … 4, 4+). Ray
 * soldan saga `accent`ten sonuge giden bir degrade (NativeWind degrade sinifi tasimadigi icin
 * `react-native-svg`, Parilti deseni), secili durakta acik renkli tutamac, altinda duragin basligi ve
 * cumlesi. Secim uc yoldan: rayi parmakla surukleyerek, bir duraga dokunarak ya da ekran okuyucunun
 * artir/azalt eylemi (`accessibilityRole="adjustable"`) -- ZorlukKadrani deseni.
 *
 * Duraklar rayin OLCULEN genisligine gore mutlak konumlanir: Android, ebeveyninin sinirlari disina
 * tasan cocuga dokunmayi iletmez, bu yuzden webdeki sifir genislikli yuva hilesi burada kullanilmaz.
 *
 * Kok bir fragment: kutu `flex-1`, panel `w-full` -- set formunun satiri `flex-wrap` oldugu icin panel
 * uc alanin ALTINA tam genislikte duser.
 */
export default function RirAlani({ id, deger, onDegis, temizlenebilir = true, hata }: Props) {
  const ikonRenk = useIkonRenk();
  const palet = useRenkPaleti();
  const { t } = useTranslation();
  const [acik, setAcik] = useState(false);
  const [bilgiAcik, setBilgiAcik] = useState(false);
  const [rayGenisligi, setRayGenisligi] = useState(0);
  const degradeId = `rirRay${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const seciliSira = deger === null ? -1 : rirDurakSirasi(deger);
  const aciklama = deger === null ? null : rirAciklamasi(deger);
  const etiket = deger === null ? null : rirEtiketi(deger);
  const sonSira = RIR_DURAKLARI.length - 1;

  // PanResponder bir kez kurulur (her render'da yeniden kurmak suren jesti koparirdi); guncel
  // `deger`/`onDegis`e ref uzerinden ulasir.
  const degerRef = useRef(deger);
  const onDegisRef = useRef(onDegis);
  useEffect(() => {
    degerRef.current = deger;
    onDegisRef.current = onDegis;
  }, [deger, onDegis]);

  function sec(rir: number) {
    if (rir !== degerRef.current) {
      // #388: her yeni durakta alt menudeki (#379) hafif tik -- surukleme, dokunus ve artir/azalt ortak.
      void Haptics.selectionAsync();
      degerRef.current = rir;
      onDegisRef.current(rir);
    }
  }

  function siraSec(sira: number) {
    if (sira >= 0 && sira <= sonSira) {
      sec(RIR_DURAKLARI[sira]);
    }
  }

  const rayRef = useRef<View>(null);
  /** Rayin penceredeki sol kenari ve genisligi -- jest basinda olculur. */
  const rayOlcusuRef = useRef<{ x: number; genislik: number } | null>(null);

  /** Parmagin PENCERE koordinati (pageX) kullanilir: `locationX` parmagin degdigi cocuga goredir. */
  function surukle(pageX: number) {
    const olcu = rayOlcusuRef.current;
    if (olcu && olcu.genislik > 0) {
      sec(enYakinRirDegeri((pageX - olcu.x) / olcu.genislik));
    }
  }

  const suruklemeRef = useRef(
    PanResponder.create({
      // ZorlukKadrani deseni: tek dokunus once duraga sorulur (onPress), hareket CAPTURE ile alinir.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (olay: GestureResponderEvent) => {
        const { pageX } = olay.nativeEvent;
        rayRef.current?.measureInWindow((x, _y, genislik) => {
          rayOlcusuRef.current = { x, genislik };
          surukle(pageX);
        });
      },
      onPanResponderMove: (olay: GestureResponderEvent) => surukle(olay.nativeEvent.pageX),
    }),
  );

  /** Duragin (ya da etiketin) rayda ortalanmis sol konumu. */
  function konum(sira: number, boyut: number) {
    return (sira / sonSira) * rayGenisligi - boyut / 2;
  }

  return (
    <>
      <View className="flex-1 flex-col gap-1">
        <Pressable
          nativeID={id}
          testID={id}
          accessibilityRole="button"
          accessibilityLabel={t('rir.alanDegeri', { deger: etiket ?? t('rir.girilmedi') })}
          accessibilityState={{ expanded: acik }}
          onPress={() => {
            Keyboard.dismiss();
            // Kullanici karari: tutamac hep gorunsun -- bos alan acilinca 0'dan baslar.
            if (!acik && deger === null) {
              onDegis(RIR_DURAKLARI[0]);
            }
            setAcik(!acik);
          }}
          className={`relative h-15 w-full justify-end rounded-lg pb-2 pl-2 ${acik ? 'bg-surface-2' : 'bg-inset'}`}
        >
          <Text className="absolute top-2 left-2 text-label-xs text-muted uppercase">{t('setGirdisi.rirEtiket')}</Text>
          <Text className={`text-heading ${etiket ? 'text-fg' : 'text-muted/40'}`}>{etiket ?? '—'}</Text>
          <Text className="absolute right-2 bottom-2.5 text-label-xs text-muted">{t('setGirdisi.kalanBirimi')}</Text>
        </Pressable>
        {hata && (
          <Text accessibilityRole="alert" className="text-label text-danger">
            {hata}
          </Text>
        )}
      </View>

      {acik && (
        <View className="w-full gap-3 rounded-lg bg-inset p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-body-lg text-fg">{t('rir.kaydirici')}</Text>
            <View className="flex-row items-center gap-1">
              {temizlenebilir && deger !== null && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    // Deger kalkinca panel de kapanir: tutamacsiz bos bir ray kalmaz.
                    onDegis(null);
                    setAcik(false);
                  }}
                  className="h-10 justify-center rounded-lg px-3"
                >
                  <Text className="text-label text-muted">{t('rir.temizle')}</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('rir.bilgiDugmesi')}
                accessibilityState={{ expanded: bilgiAcik }}
                onPress={() => setBilgiAcik((onceki) => !onceki)}
                className="size-10 items-center justify-center rounded-full"
              >
                <Info color={ikonRenk.fg} size={22} />
              </Pressable>
            </View>
          </View>
          {bilgiAcik && <Text className="text-body text-muted">{t('rir.bilgi')}</Text>}

          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={t('rir.kaydirici')}
            accessibilityValue={
              aciklama
                ? { min: 0, max: RIR_DURAKLARI[sonSira], now: RIR_DURAKLARI[seciliSira], text: `${aciklama.baslik} ${aciklama.cumle}` }
                : { text: t('rir.girilmedi') }
            }
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(olay) => {
              if (olay.nativeEvent.actionName === 'increment') {
                siraSec(seciliSira + 1);
              } else if (olay.nativeEvent.actionName === 'decrement') {
                siraSec(seciliSira - 1);
              }
            }}
            className="gap-2 px-4"
          >
            <View className="h-5" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              {rayGenisligi > 0 &&
                RIR_DURAKLARI.map((rir, sira) =>
                  ETIKETLI.has(rir) ? (
                    <Text
                      key={rir}
                      style={{ position: 'absolute', left: konum(sira, ETIKET_GENISLIK), width: ETIKET_GENISLIK }}
                      className="text-center text-body text-fg"
                    >
                      {rirEtiketi(rir)}
                    </Text>
                  ) : null,
                )}
            </View>
            <View
              ref={rayRef}
              onLayout={(olay) => setRayGenisligi(olay.nativeEvent.layout.width)}
              className="h-8 justify-center"
              {...suruklemeRef.current.panHandlers}
            >
              {/* Ray uc duraklarin biraz disina tasar (referanstaki gibi): uc noktalar yuvarlak kenarda kaybolmaz. */}
              <View pointerEvents="none" className="absolute -inset-x-3">
                <Svg width="100%" height={RAY_YUKSEKLIK}>
                  <Defs>
                    <LinearGradient id={degradeId} x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor={palet.accent} />
                      <Stop offset="1" stopColor={palet['surface-4']} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height={RAY_YUKSEKLIK} rx={RAY_YUKSEKLIK / 2} fill={`url(#${degradeId})`} />
                </Svg>
              </View>
              {RIR_DURAKLARI.map((rir, sira) => (
                <Pressable
                  key={rir}
                  accessibilityRole="button"
                  accessibilityLabel={rirEtiketi(rir)}
                  accessibilityState={{ selected: sira === seciliSira }}
                  onPress={() => sec(rir)}
                  style={{ position: 'absolute', left: konum(sira, DURAK_BOYUT), width: DURAK_BOYUT, height: DURAK_BOYUT }}
                  className="items-center justify-center"
                >
                  {sira === seciliSira ? (
                    <View className="size-7 rounded-full bg-fg" />
                  ) : (
                    <View className="size-1.5 rounded-full bg-bg" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <Text className="min-h-10 text-body text-muted">
            {aciklama && (
              <>
                <Text className="font-bold text-fg">{aciklama.baslik}</Text> <Text>{aciklama.cumle}</Text>
              </>
            )}
          </Text>
        </View>
      )}
    </>
  );
}
