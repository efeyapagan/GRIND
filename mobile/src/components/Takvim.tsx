import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { CalendarDays } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useDil } from '@grind/shared/i18n';
import { useCalendar } from '@grind/shared/api/queries';
import { formatAralik, trBugundenOnce } from '@grind/shared/lib/format';
import {
  ayBasligi,
  ayinGunu,
  ayIzgarasi,
  gezilebilirMi,
  gorunumAraligi,
  gunBasligi,
  haftaGunleri,
  kaydir,
  type TakvimGorunumu,
} from '@grind/shared/lib/takvim';
import IkonDugmesi from '../ui/IkonDugmesi';
import { ikonRenk } from '../ui/renkler';

const GUN_KISALTMALARI = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

/** Kaydirmanin donem degistirmesi icin gereken yatay mesafe (px). */
const KAYDIRMA_ESIGI = 40;

/**
 * #315: antrenman yapilan gun YESIL, yapilmayan notr (web/src/components/Takvim.tsx ile ayni).
 * Set sayisina gore kademeli tonlar kalkti: ara opakliklarda ne acik ne koyu yazi 4.5:1'i tutturuyordu.
 */
const ANTRENMANLI_SINIFI = 'bg-success';
const BOS_SINIFI = 'bg-surface-2';

interface Props {
  bugun?: string;
}

/**
 * Ana Sayfa'daki Takvim (#81, #119/#120 ile buraya tasindi): Aylik/Haftalik izgara. CSS Grid'in
 * RN karsiligi yok -- `ayIzgarasi`/`haftaGunleri` zaten HAFTA SATIRLARI dondurdugu icin izgara
 * duz `flex-row` satirlariyla kurulur (web'deki `grid-cols-7` yerine).
 */
export default function Takvim({ bugun = trBugundenOnce(0) }: Props) {
  const { t } = useTranslation();
  const dil = useDil();
  const router = useRouter();
  // #315: uygulama HAFTALIK acilir -- kullanici en cok icinde bulundugu haftayla ilgilenir.
  const [gorunum, setGorunum] = useState<TakvimGorunumu>('hafta');
  const [gosterilen, setGosterilen] = useState(bugun);
  // Son gezinme yonu: giris animasyonu hangi taraftan gelecegini buradan okur.
  const [yon, setYon] = useState<-1 | 1>(1);
  const { from, to } = gorunumAraligi(gorunum, gosterilen);
  const { data: ozet, isLoading, isError, isPlaceholderData } = useCalendar(from, to);

  const gunler = new Map((ozet?.days ?? []).map((kayit) => [kayit.date, kayit]));
  const satirlar = gorunum === 'ay' ? ayIzgarasi(gosterilen) : [haftaGunleri(gosterilen)];
  const donemBasligi =
    gorunum === 'ay' ? ayBasligi(gosterilen, dil) : formatAralik(`${from}T12:00:00Z`, `${to}T12:00:00Z`, dil);
  const bosMetin = gorunum === 'ay' ? 'Bu ay antrenman yok.' : 'Bu hafta antrenman yok.';

  function gorunumDegistir() {
    setGorunum(gorunum === 'ay' ? 'hafta' : 'ay');
    setGosterilen(bugun);
  }

  /** Gelecege gezinilmez (#81): kapali yonde hareket sessizce yok sayilir. */
  function gezin(gidilenYon: -1 | 1) {
    if (!gezilebilirMi(gorunum, gosterilen, gidilenYon, bugun)) {
      return;
    }
    setYon(gidilenYon);
    setGosterilen(kaydir(gorunum, gosterilen, gidilenYon));
  }

  // Donem degistirmenin TEK yolu yatay kaydirma (#315): ok dugmeleri kalkti. Dikey hareket
  // sayfanin kendi kaydirmasina birakilir (`failOffsetY`), yoksa listeyi kaydirmak takvimi cevirirdi.
  const kaydirmaHareketi = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-KAYDIRMA_ESIGI, KAYDIRMA_ESIGI])
    .failOffsetY([-KAYDIRMA_ESIGI, KAYDIRMA_ESIGI])
    .onEnd((olay) => {
      if (Math.abs(olay.translationX) < KAYDIRMA_ESIGI) {
        return;
      }
      // Sola kaydirma (parmak sola) ileri, saga kaydirma geri.
      gezin(olay.translationX < 0 ? 1 : -1);
    });

  return (
    <View className="flex flex-col gap-3">
      <View className="flex flex-col gap-3">
        {/* #315: donem basligi ve SAG kosesinde gorunum ikonu -- ikon gun kartlarinin DISINDA. */}
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-body-lg text-fg">{donemBasligi}</Text>
          <IkonDugmesi
            etiket={t(gorunum === 'ay' ? 'takvim.haftalikGorunumeGec' : 'takvim.aylikGorunumeGec')}
            onPress={gorunumDegistir}
          >
            <CalendarDays color={ikonRenk.muted} size={20} />
          </IkonDugmesi>
        </View>

        <GestureDetector gesture={kaydirmaHareketi}>
        {/* #315: izgara iki gorunumde de TAM GENISLIGE yayilir (#84'un 256 px siniri kalkti). */}
        {/* `key`: donem degisince izgara yeniden monte olur ve kartlar yandan girer (#315) --
            ileri gidilince sagdan, geri gidilince soldan. */}
        <Animated.View
          key={gosterilen}
          entering={(yon === 1 ? SlideInRight : SlideInLeft).duration(200)}
          testID="takvim-izgara"
          className={`w-full flex-col ${gorunum === 'ay' ? 'gap-1' : 'gap-2'}`}
        >
          <View className={`flex-row ${gorunum === 'ay' ? 'gap-1' : 'gap-2'}`}>
            {GUN_KISALTMALARI.map((kisaltma) => (
              <Text key={kisaltma} className="flex-1 text-center text-label-xs text-muted uppercase">
                {kisaltma}
              </Text>
            ))}
          </View>
          {satirlar.map((hafta, haftaSira) => (
            <View key={haftaSira} className={`flex-row ${gorunum === 'ay' ? 'gap-1' : 'gap-2'}`}>
              {hafta.map((gun, sira) => {
                if (gun === null) {
                  return <View key={`bos-${sira}`} className={`flex-1 ${gorunum === 'ay' ? 'h-9' : 'aspect-square'}`} />;
                }
                const kayit = gunler.get(gun);
                // #261: `ring-*` BASTAN var, yalnizca RENGI degisir. Ilk render'dan sonra eklenen
                // bir `ring-*` NativeWind'de bileseni "yukseltiyor"; uyarisini basarken prop'lari
                // (elementlerin `_owner` fiber'lari dahil) JSON'a ceviriyor ve bu cevirme navigasyon
                // context'inin varsayilan degerindeki getter'a carpip "Couldn't find a navigation
                // context" ile cokuyordu -- HareketKartlari'nda ayni tuzak belgeli.
                const vurguSinifi = gun === bugun ? 'ring-1 ring-muted' : 'ring-1 ring-transparent';
                return (
                  <View key={gun} className="flex-1 items-center">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${gunBasligi(gun, dil)}: ${kayit ? `${kayit.setCount} set` : 'antrenman yok'}`}
                    onPress={() => router.push(`/gun/${gun}`)}
                    // #315: gun kutulari DAIRE. Haftalikta daire sutunu doldurur; aylikta sabit 36 px
                    // daire sutunda ortalanir -- 5-6 satir sutun genisliginde daire olsaydi izgara uzardi.
                    // `w-full`: sarmalayici `items-center` oldugu icin `flex-1` burada genislik
                    // vermez (capraz eksen) -- daire sutunu ancak tam genislikle doldurur.
                    className={`items-center justify-center rounded-full ${
                      gorunum === 'ay' ? 'size-9' : 'aspect-square w-full'
                    } ${kayit ? ANTRENMANLI_SINIFI : BOS_SINIFI} ${vurguSinifi}`}
                  >
                    <Text className={`text-label ${kayit ? 'text-on-success' : 'text-muted'}`}>{ayinGunu(gun)}</Text>
                  </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </Animated.View>
        </GestureDetector>

        {isLoading && <Text className="text-body text-muted">Yükleniyor...</Text>}
        {isError && (
          <Text accessibilityRole="alert" className="text-body text-danger">
            Takvim alınamadı.
          </Text>
        )}
        {ozet && !isPlaceholderData && ozet.days.length === 0 && (
          <Text className="text-body text-muted">{bosMetin}</Text>
        )}

        {ozet && (
          // #315: ozet yalnizca IKI seri -- "Antrenman gunu" ve "Bu hafta" kaldirildi. Ikisi yan yana
          // kart; hedef yoksa (#97) hedef serisi anlamsiz oldugu icin cizilmez, aktif seri tam genisler.
          <View className="flex-row gap-2">
            <OzetDegeri etiket={t('takvim.aktifSeri')} deger={t('takvim.haftaSayisi', { count: ozet.currentWeekStreak })} />
            {ozet.weeklyTargetDays !== null && (
              <OzetDegeri
                etiket={t('takvim.hedefSerisi')}
                deger={t('takvim.haftaSayisi', { count: ozet.currentTargetStreak ?? 0 })}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function OzetDegeri({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <View className="flex-1 flex-col gap-1 rounded-xl bg-surface-1 p-4">
      <Text className="text-label text-muted">{etiket}</Text>
      <Text className="text-metric text-fg">{deger}</Text>
    </View>
  );
}
