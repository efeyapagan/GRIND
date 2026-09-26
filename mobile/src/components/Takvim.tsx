import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { LayoutAnimationConfig, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { CalendarDays, Check, Flame } from 'lucide-react-native';
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
import { useIkonRenk } from '../ui/renkler';

const GUN_ANAHTARLARI = ['pt', 'sa', 'ca', 'pe', 'cu', 'ct', 'pz'] as const;

/** Kaydirmanin donem degistirmesi icin gereken yatay mesafe (px). */
const KAYDIRMA_ESIGI = 40;

interface Props {
  bugun?: string;
}

/**
 * Ana Sayfa'daki Takvim (#81, #119/#120 ile buraya tasindi): Aylik/Haftalik izgara. CSS Grid'in
 * RN karsiligi yok -- `ayIzgarasi`/`haftaGunleri` zaten HAFTA SATIRLARI dondurdugu icin izgara
 * duz `flex-row` satirlariyla kurulur (web'deki `grid-cols-7` yerine).
 */
export default function Takvim({ bugun = trBugundenOnce(0) }: Props) {
  const ikonRenk = useIkonRenk();
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
  const bosMetin = t(gorunum === 'ay' ? 'takvim.buAyYok' : 'takvim.buHaftaYok');

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

        {/* #332: giris animasyonu YALNIZCA donem degisince calisir, takvimin ilk montajinda degil.
            Antrenman bitince ana sayfa acilirken "Devam ediyor" karti bir an cizilip kalkiyor ve
            takvim yukari kayiyordu; ilk montajdaki kayma animasyonu surerken gelen bu yerlesim
            degisikligi izgarayi ekranin disinda birakiyordu (sekme degisip yeniden monte olunca
            duzeliyordu). `key` ile yeniden monte olan izgara yine animasyonla girer. */}
        <LayoutAnimationConfig skipEntering>
        <GestureDetector gesture={kaydirmaHareketi}>
        {/* #315: izgara iki gorunumde de TAM GENISLIGE yayilir (#84'un 256 px siniri kalkti). */}
        {/* `key`: donem degisince izgara yeniden monte olur ve kartlar yandan girer (#315) --
            ileri gidilince sagdan, geri gidilince soldan. */}
        <Animated.View
          key={gosterilen}
          entering={(yon === 1 ? SlideInRight : SlideInLeft).duration(200)}
          testID="takvim-izgara"
          className="w-full flex-col gap-1"
        >
          <View className="flex-row gap-1">
            {GUN_ANAHTARLARI.map((anahtar) => (
              <Text key={anahtar} className="flex-1 text-center text-label-xs text-muted uppercase">
                {t(`takvim.gunKisaltmalari.${anahtar}`)}
              </Text>
            ))}
          </View>
          {satirlar.map((hafta, haftaSira) => (
            <View key={haftaSira} className="flex-row gap-1">
              {hafta.map((gun, sira) =>
                gun === null ? (
                  <View key={`bos-${sira}`} className="flex-1" />
                ) : (
                  <GunHucresi
                    key={gun}
                    gun={gun}
                    bugunMu={gun === bugun}
                    setSayisi={gunler.get(gun)?.setCount ?? null}
                    onPress={() => router.push(`/gun/${gun}`)}
                  />
                ),
              )}
            </View>
          ))}
        </Animated.View>
        </GestureDetector>
        </LayoutAnimationConfig>

        {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
        {isError && (
          <Text accessibilityRole="alert" className="text-body text-danger">
            {t('takvim.hata')}
          </Text>
        )}
        {ozet && !isPlaceholderData && ozet.days.length === 0 && (
          <Text className="text-body text-muted">{bosMetin}</Text>
        )}

        {ozet && (
          // #324: solda haftalik seri (ates + en uzun seri), sagda bu haftanin hedef ilerlemesi (x/hedef).
          // Hedef kartina dokununca hedef ekrani acilir; hedef yokken (#97) kart "Hedef belirle"ye cagirir.
          <View className="flex-row gap-2">
            <OzetKarti etiket={t('takvim.haftalikSeri')}>
              <View
                accessible
                accessibilityLabel={t('takvim.haftaSayisi', { count: ozet.currentWeekStreak })}
                className="flex-row items-center gap-1"
              >
                <Text className="text-metric text-accent">{ozet.currentWeekStreak}</Text>
                <Flame color={ikonRenk.accent} fill={ikonRenk.accent} size={24} />
              </View>
              <Text className="text-label text-muted">
                {t('takvim.rekorun', { count: ozet.longestWeekStreak })}
              </Text>
            </OzetKarti>
            <OzetKarti etiket={t('takvim.haftalikHedef')} onPress={() => router.push('/haftalik-hedef')}>
              {ozet.weeklyTargetDays === null ? (
                <Text className="text-body-lg text-muted">{t('takvim.hedefBelirle')}</Text>
              ) : (
                <Text
                  accessibilityLabel={t('takvim.haftalikHedefDegeri', {
                    count: ozet.thisWeekTrainedDays,
                    hedef: ozet.weeklyTargetDays,
                  })}
                  className="text-metric"
                >
                  <Text className="text-accent">{ozet.thisWeekTrainedDays}</Text>
                  <Text className="text-muted">/{ozet.weeklyTargetDays}</Text>
                </Text>
              )}
            </OzetKarti>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * #324: haftalik ve aylik gorunumun ORTAK gun hucresi -- iki gorunum yalnizca satir sayisinda ayrilir.
 * Gun numarasi ve altinda kucuk bir isaret: antrenmanli gunde yesil daire icinde onay (#315'in yesili),
 * antrenmansiz gunde bos halka. Bugun hafif gri bir zeminle vurgulanir.
 *
 * #261 notu: `ring-*` ilk render'dan SONRA eklenince NativeWind bileseni "yukseltip" navigasyon
 * context'inde cokuyordu. Bugun vurgusu artik yalnizca zemin rengi (`bg-*`) degisimi -- o tuzaga girmez.
 */
function GunHucresi({
  gun,
  bugunMu,
  setSayisi,
  onPress,
}: {
  gun: string;
  bugunMu: boolean;
  setSayisi: number | null;
  onPress: () => void;
}) {
  const ikonRenk = useIkonRenk();
  const { t } = useTranslation();
  const dil = useDil();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${gunBasligi(gun, dil)}: ${
        setSayisi !== null ? t('setler.setSayisi', { count: setSayisi }) : t('takvim.antrenmanYok')
      }`}
      onPress={onPress}
      className={`flex-1 items-center gap-1 rounded-lg py-1.5 ${bugunMu ? 'bg-surface-2' : 'bg-transparent'}`}
    >
      <Text className={`text-label ${bugunMu ? 'text-fg' : 'text-muted'}`}>{ayinGunu(gun)}</Text>
      <View className="size-5 items-center justify-center">
        {setSayisi !== null ? (
          <View testID="gun-isareti-antrenmanli" className="size-5 items-center justify-center rounded-full bg-success">
            <Check color={ikonRenk.onSuccess} size={12} strokeWidth={3} />
          </View>
        ) : (
          <View testID="gun-isareti-bos" className="size-3 rounded-full border-2 border-surface-4" />
        )}
      </View>
    </Pressable>
  );
}

/** Ozet karti; `onPress` verilirse kartin tamami dokunulabilir (hedef karti hedef ekranini acar). */
function OzetKarti({
  etiket,
  onPress,
  children,
}: {
  etiket: string;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      className="flex-1 flex-col gap-1 rounded-xl bg-surface-1 p-4"
    >
      <Text className="text-label text-muted">{etiket}</Text>
      {children}
    </Pressable>
  );
}
