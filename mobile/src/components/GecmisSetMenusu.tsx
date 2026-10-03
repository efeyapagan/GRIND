import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { setDegistiTazele, setiSil, type SetKaydi } from '@grind/shared/api/queries';
import CamYuzey from '../ui/CamYuzey';
import { useEtkinTema } from '../ui/renkler';
import { useKlavyeYuksekligi } from '../ui/useKlavyeYuksekligi';
import DuzenleSilSecenekleri from './DuzenleSilSecenekleri';
import SetDegeriYazisi from './SetDegeriYazisi';
import SetDuzenleyici from './SetDuzenleyici';

interface Props {
  kayit: SetKaydi;
  sira: number;
  onKapat: () => void;
}

/** Antrenman ekranindaki set duzenleyicinin acilisi (#396) gibi: hafif kucukten, ayni yayla buyur. */
const ACILIS = ZoomIn.springify().damping(14).stiffness(180).mass(0.8).withInitialValues({ transform: [{ scale: 0.92 }] });
const KAPANIS = FadeOut.duration(150);

/**
 * #564: gecmisteki bir sete basili tutunca acilan menu -- sablon menusundeki (`SablonMenusu`) Duzenle /
 * Sil secenekleri ve silmenin yerinde onayi (`DuzenleSilSecenekleri`). Gecmis detay paneli bir `Modal`
 * oldugu icin ikinci bir `Modal` acilmaz; menu panelin ustunde, ayni pencerede bir katmandir.
 *
 * Duzenle, menunun yerinde antrenman ekranindaki `SetDuzenleyici`yi acar (silme orada yok -- tek yol
 * menudeki onayli Sil). Sunucu bitmis antrenmanin setini de duzeltir/siler ve rekorlari yeniden
 * hesaplar; gecmis ve rekorlar `setDegistiTazele` ile tazelenir, panel guncel oturumu listeden alir.
 */
export default function GecmisSetMenusu({ kayit, sira, onKapat }: Props) {
  const { t } = useTranslation();
  const etkinTema = useEtkinTema();
  const queryClient = useQueryClient();
  const klavyeYuksekligi = useKlavyeYuksekligi();
  const [duzenleniyor, setDuzenleniyor] = useState(false);

  useEffect(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  function sil() {
    onKapat();
    // Antrenman ekranindaki silmeyle ayni (`setiSil` + `setDegistiTazele`); basarisiz olursa set
    // listede kalir, tazeleme gercegi gosterir.
    void setiSil(kayit.id).then(
      () => setDegistiTazele(queryClient, kayit),
      () => undefined,
    );
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(150)} exiting={KAPANIS} style={StyleSheet.absoluteFill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('gecmis.setMenusunuKapat')}
          onPress={onKapat}
          className={`flex-1 ${etkinTema === 'acik' ? 'bg-black/20' : 'bg-black/40'}`}
        />
      </Animated.View>
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { paddingBottom: klavyeYuksekligi }]}
        className="justify-center px-4"
      >
        {duzenleniyor ? (
          <Animated.View entering={ACILIS} exiting={KAPANIS}>
            <SetDuzenleyici kayit={kayit} sira={sira} onKapat={onKapat} />
          </Animated.View>
        ) : (
          <Animated.View
            testID="set-menusu"
            entering={ACILIS}
            exiting={KAPANIS}
            className="overflow-hidden rounded-2xl border border-surface-4"
          >
            <CamYuzey />
            <View className="flex-col gap-1 px-5 pt-4">
              <Text numberOfLines={1} className="text-label text-muted uppercase">
                {kayit.exerciseName} · {t('setler.setSirasi', { sira })}
              </Text>
              <SetDegeriYazisi kayit={kayit} className="text-body-lg text-fg" birimSinifi="text-fg" />
            </View>
            <DuzenleSilSecenekleri
              duzenleEtiketi={t('gecmis.setiDuzenle')}
              silEtiketi={t('setler.setiSil')}
              silOnayMesaji={t('gecmis.setSilOnayi')}
              onDuzenle={() => setDuzenleniyor(true)}
              onSil={sil}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
}
