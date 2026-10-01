import { useCallback, useId, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useRenkPaleti } from './renkler';

const CIZGI_YUKSEKLIGI = 10;
/**
 * Cizgi metnin hemen altinda baslar; yerlesime girmedigi icin bu bosluk stille verilir.
 * 2 px iken Turkce alt kuyruklar ("ş", "ğ") cizgiye DEGIYORDU (#502, simulatorde gorunur).
 */
const CIZGI_BOSLUGU = 5;
const CIZIM_SURESI_MS = 1200;
/**
 * #548 (kullanici bildirdi): cizgi sagda kalinlik parca parca inceliyordu ama hep TAM opaklikta
 * bitiyordu -- ince de olsa ani bir kesim gibi goruluyordu. Son %22'lik dilimde opaklik 1'den 0'a
 * iner; govdenin kalani (0 - SOLUKLUK_BASLANGICI) degismez, yalnizca son uc yumusar.
 */
const SOLUKLUK_BASLANGICI = 0.78;

/**
 * #548 (kullanici bildirdi, ikinci bulgu -- ilk duzeltme yalnizca SAG UCUN soluklugunu ele almisti):
 * "resmen kalemin ucunu degistirir gibi" iki keskin kalinlik sicramasi vardi (3 sabit parca ->
 * 2 gecis noktasi). Kalinlik artik SUREKLI bir fonksiyonla (`kalinlikAt`) hesaplanir; govde COK
 * sayida (bkz. *_DILIM_SAYISI) ince dilime bolunup her dilime kendi ANLIK kalingi verilir --
 * dilimler arasindaki fark o kadar kucuk ki goze sicrama degil, surekli bir incelme gibi gorunur.
 */
const BASLANGIC_KALINLIGI = 3.6;
const BITIS_KALINLIGI = 1.2;
const KAVIS_DILIM_SAYISI = 16;
/** Dalga 6 kubik alt-egriden olusur (3 "C+S" cifti); her biri kendi icinde de dilimlenir. */
const DALGA_ALT_EGRI_DILIMI = 3;

/** Govdenin [0,1] konumuna gore anlik kalinlik -- dogrusal, BASLANGIC_KALINLIGI'ndan BITIS_KALINLIGI'na. */
function kalinlikAt(t: number): number {
  return BASLANGIC_KALINLIGI + (BITIS_KALINLIGI - BASLANGIC_KALINLIGI) * t;
}

/** Tek bir ikinci derece Bezier kavisinin [t0, t1] araligi (de Casteljau alt egrisi). */
function kavisParcasi(genislik: number, t0: number, t1: number): string {
  const p0 = { x: 2, y: CIZGI_YUKSEKLIGI - 3 };
  const c = { x: genislik * 0.45, y: 1 };
  const p2 = { x: genislik - 2, y: CIZGI_YUKSEKLIGI - 5 };
  const nokta = (t: number) => ({
    x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t ** 2 * p2.x,
    y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t ** 2 * p2.y,
  });
  const a = (1 - t0) * (1 - t1);
  const b = (1 - t0) * t1 + t0 * (1 - t1);
  const d = t0 * t1;
  const bas = nokta(t0);
  const son = nokta(t1);
  return `M${bas.x} ${bas.y} Q ${a * p0.x + b * c.x + d * p2.x} ${a * p0.y + b * c.y + d * p2.y} ${son.x} ${son.y}`;
}

/** Kavis govdesini KAVIS_DILIM_SAYISI ince dilime boler; her dilim kendi anlik kalingini tasir. */
function kavisDilimleri(genislik: number): { d: string; kalinlik: number }[] {
  return Array.from({ length: KAVIS_DILIM_SAYISI }, (_, i) => {
    const t0 = i / KAVIS_DILIM_SAYISI;
    const t1 = (i + 1) / KAVIS_DILIM_SAYISI;
    return { d: kavisParcasi(genislik, t0, t1), kalinlik: kalinlikAt((t0 + t1) / 2) };
  });
}

type Nokta = { x: number; y: number };

function kubikNokta(p0: Nokta, p1: Nokta, p2: Nokta, p3: Nokta, t: number): Nokta {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

function kubikTeget(p0: Nokta, p1: Nokta, p2: Nokta, p3: Nokta, t: number): Nokta {
  const u = 1 - t;
  return {
    x: 3 * u ** 2 * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t ** 2 * (p3.x - p2.x),
    y: 3 * u ** 2 * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t ** 2 * (p3.y - p2.y),
  };
}

/**
 * Bir kubik Bezier'in [t0, t1] alt araligi -- yeni kontrol noktalari uc noktalarin ve o noktalardaki
 * TEGETLERIN (olceklenmis) birlesiminden gelir (standart bir ozdeslik, tam de Casteljau'ya gerek yok).
 */
function kubikParcasi(p0: Nokta, p1: Nokta, p2: Nokta, p3: Nokta, t0: number, t1: number): string {
  const dt = t1 - t0;
  const bas = kubikNokta(p0, p1, p2, p3, t0);
  const son = kubikNokta(p0, p1, p2, p3, t1);
  const tegetBas = kubikTeget(p0, p1, p2, p3, t0);
  const tegetSon = kubikTeget(p0, p1, p2, p3, t1);
  const q1 = { x: bas.x + (dt / 3) * tegetBas.x, y: bas.y + (dt / 3) * tegetBas.y };
  const q2 = { x: son.x - (dt / 3) * tegetSon.x, y: son.y - (dt / 3) * tegetSon.y };
  return `M${bas.x} ${bas.y} C ${q1.x} ${q1.y} ${q2.x} ${q2.y} ${son.x} ${son.y}`;
}

/**
 * Dalganin 6 kubik alt-egrisi (eskizdeki her "C ... S ..." cifti iki kubige acilir, S'in ilk
 * kontrol noktasi bir ONCEKI kontrol noktasinin yansimasidir). Kontrol noktalari #524'teki el
 * cizimiyle AYNI -- yalnizca burada tek tek dilimlenebilsinler diye acikca yazildi.
 */
function dalgaAltEgrileri(genislik: number): [Nokta, Nokta, Nokta, Nokta][] {
  const w = genislik;
  const p0 = { x: 2, y: 6 };
  const c1 = { x: w * 0.05, y: 1.5 };
  const c2 = { x: w * 0.11, y: 0.5 };
  const p1 = { x: w * 0.18, y: 3.5 };
  const c3 = { x: 2 * p1.x - c2.x, y: 2 * p1.y - c2.y };
  const c4 = { x: w * 0.27, y: 9.5 };
  const p2 = { x: w * 0.35, y: 6.5 };
  const c5 = { x: w * 0.42, y: 3 };
  const c6 = { x: w * 0.47, y: 0.5 };
  const p3 = { x: w * 0.55, y: 3 };
  const c7 = { x: 2 * p3.x - c6.x, y: 2 * p3.y - c6.y };
  const c8 = { x: w * 0.63, y: 8.5 };
  const p4 = { x: w * 0.7, y: 6 };
  const c9 = { x: w * 0.75, y: 4 };
  const c10 = { x: w * 0.8, y: 2 };
  const p5 = { x: w * 0.86, y: 3.5 };
  const c11 = { x: 2 * p5.x - c10.x, y: 2 * p5.y - c10.y };
  const c12 = { x: w * 0.93, y: 5.5 };
  const p6 = { x: w - 2, y: 4.5 };
  return [
    [p0, c1, c2, p1],
    [p1, c3, c4, p2],
    [p2, c5, c6, p3],
    [p3, c7, c8, p4],
    [p4, c9, c10, p5],
    [p5, c11, c12, p6],
  ];
}

/** Dalga govdesini (6 alt-egri x DALGA_ALT_EGRI_DILIMI) ince dilime boler, kavisle ayni mantikla. */
function dalgaDilimleri(genislik: number): { d: string; kalinlik: number }[] {
  const altEgriler = dalgaAltEgrileri(genislik);
  const sonuc: { d: string; kalinlik: number }[] = [];
  altEgriler.forEach(([p0, p1, p2, p3], egriSirasi) => {
    for (let i = 0; i < DALGA_ALT_EGRI_DILIMI; i++) {
      const t0 = i / DALGA_ALT_EGRI_DILIMI;
      const t1 = (i + 1) / DALGA_ALT_EGRI_DILIMI;
      // Govdenin GENEL konumu: 6 alt-egri + her birinin kendi [0,1]'i -> tek bir [0,1] eksene.
      const genelOrta = (egriSirasi + (t0 + t1) / 2) / altEgriler.length;
      sonuc.push({ d: kubikParcasi(p0, p1, p2, p3, t0, t1), kalinlik: kalinlikAt(genelOrta) });
    }
  });
  return sonuc;
}

/**
 * #439: altini kavisli `accent` bir cizgiyle cizen sayfa basligi. Ekrana her girildiginde cizgi
 * soldan saga yavasca "cizilir": cizgi baslik genisliginde bir kez cizilir, uzerindeki pencere
 * 0'dan tam genislige acilir. Cihazda "hareketi azalt" aciksa (`ReduceMotion.System`) cizgi
 * dogrudan tam gorunur.
 *
 * #499 (iki kullanici bildirimi, ikisi de bu bilesende bulusuyor):
 * - **Cizgi YERLESIME GIRMEZ** (`absolute`, metnin altina asilir). Once metin + bosluk + cizgi
 *   tek bir sutundu ve bar bu blogu ortaliyordu: baslik metni digger sekmelerin basligindan
 *   YUKARIDA duruyordu ("cok yukarida"). Artik bilesenin yuksekligi metin kadardir, yani bar
 *   METNI ortalar -- Ana sayfa basligiyla ayni hiza.
 * - **Olcum METNE BAGLIDIR.** Yalnizca genisligi state'te tutmak, baslik degisince (antrenman
 *   baslayinca "Antrenmana basla" -> "Antrenman") cizgiyi ESKI uzunlukta birakiyordu: RN metin
 *   degisince `onLayout`u her zaman tetiklemiyor ve sifirlama ile olay arasindaki sira garanti
 *   degil. Olcum hangi metne ait oldugunu tasir; baska bir metne ait olcum yok sayilir, yani
 *   cizgi ya DOGRU uzunlukta cizilir ya hic cizilmez -- yanlis uzunlukta asla.
 *
 * #502 (kullanici bildirdi, #499'un iki yan etkisi):
 * - Cizginin konumu YUZDE degil, olculen metin YUKSEKLIGI. `top: '100%'` React Native'de metin
 *   kutusunun altina degil ~35 pt asagiya dusuyordu: cizgi baslikla sayfanin ilk basligi
 *   arasindaki bosluga kaciyor, alti cizili bir baslik yerine basibos bir cizgi gibi duruyordu.
 *   Olcum zaten `onLayout`tan geliyor; yukseklik de ayni olaydan alinir, ikinci bir kaynak yok.
 * - Kokteki `self-start` KALKTI: saran barin `items-center`'ini eziyor ve basligi barin TEPESINE
 *   yapistiriyordu (sagdaki GRIND ortada kaldigi icin ikisi hizasizdi). Cizgi zaten yerlesimin
 *   disinda oldugu icin kokun yuksekligi metin kadardir; ortalama dogrudan metni ortalar.
 */
export default function CizgiliBaslik({
  children,
  cizgi = 'kavis',
}: {
  children: string;
  /** #524: 'kavis' antrenman ekraninin, 'dalga' Ana sayfanin cizgisidir; olcum/animasyon ortak. */
  cizgi?: 'kavis' | 'dalga';
}) {
  const palet = useRenkPaleti();
  // useId ':' gibi karakterler uretir; `url(#...)` icinde gecersiz oldugu icin temizlenir (SablonFiguru ile ayni).
  const gradyanId = `cizgiSolukluk${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [olcum, setOlcum] = useState<{ metin: string; genislik: number; yukseklik: number } | null>(null);
  const ilerleme = useSharedValue(0);
  const gecerli = olcum?.metin === children ? olcum : null;
  const genislik = gecerli?.genislik ?? 0;

  useFocusEffect(
    useCallback(() => {
      ilerleme.value = 0;
      ilerleme.value = withTiming(1, {
        duration: CIZIM_SURESI_MS,
        easing: Easing.inOut(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    }, [ilerleme]),
  );

  const pencere = useAnimatedStyle(() => ({ width: genislik * ilerleme.value }), [genislik]);

  return (
    <View className="flex-col">
      <Text
        // Metin degisince yeniden monte olur: taze bir `onLayout` garanti edilir.
        key={children}
        accessibilityRole="header"
        className="text-title font-bold text-fg"
        onLayout={({ nativeEvent: { layout } }) =>
          setOlcum({ metin: children, genislik: layout.width, yukseklik: layout.height })
        }
      >
        {children}
      </Text>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="absolute left-0 overflow-hidden"
        style={[{ top: (gecerli?.yukseklik ?? 0) + CIZGI_BOSLUGU, height: CIZGI_YUKSEKLIGI }, pencere]}
      >
        {genislik > 0 && (
          <Svg testID="baslik-cizgisi" width={genislik} height={CIZGI_YUKSEKLIGI}>
            <Defs>
              {/* #548: userSpaceOnUse ile TUM parcalar ayni mutlak eksende -- her Path kendi
                  bounding box'ina gore degil, cizginin tam genisligine gore soluyor. */}
              <LinearGradient id={gradyanId} x1={0} y1={0} x2={genislik} y2={0} gradientUnits="userSpaceOnUse">
                <Stop offset={0} stopColor={palet.accent} stopOpacity={1} />
                <Stop offset={SOLUKLUK_BASLANGICI} stopColor={palet.accent} stopOpacity={1} />
                <Stop offset={1} stopColor={palet.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {cizgi === 'dalga' ? (
              // Eskiz tarzi: duzensiz inip cikan el cizimi dalga; govde COK ince dilimlere bolunup
              // her dilim kendi anlik kalingini tasir -- #548: 2 sabit sicrama yerine surekli incelme.
              <>
                {dalgaDilimleri(genislik).map((dilim, sira) => (
                  <Path
                    key={sira}
                    testID={sira === 0 ? 'cizgi-dalga' : undefined}
                    d={dilim.d}
                    stroke={`url(#${gradyanId})`}
                    strokeWidth={dilim.kalinlik}
                    strokeLinecap="round"
                    fill="none"
                  />
                ))}
              </>
            ) : (
              // Ortasi hafif yukari kalkan el cizimi kavis; dalgayla ayni sekilde sona dogru incelir.
              <>
                {kavisDilimleri(genislik).map((dilim, sira) => (
                  <Path
                    key={sira}
                    testID={sira === 0 ? 'cizgi-kavis' : undefined}
                    d={dilim.d}
                    stroke={`url(#${gradyanId})`}
                    strokeWidth={dilim.kalinlik}
                    strokeLinecap="round"
                    fill="none"
                  />
                ))}
              </>
            )}
          </Svg>
        )}
      </Animated.View>
    </View>
  );
}
