import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { setDegistiTazele, setiSil, type SetKaydi } from '@grind/shared/api/queries';
import CamKatmanlari from '../ui/CamKatmanlari';
import DuzenleSilSecenekleri from './DuzenleSilSecenekleri';
import GecmisKatmani from './GecmisKatmani';
import SetDegeriYazisi from './SetDegeriYazisi';
import SetDuzenleyici from './SetDuzenleyici';

interface Props {
  kayit: SetKaydi;
  sira: number;
  onKapat: () => void;
}

/**
 * #564: gecmisteki bir sete basili tutunca acilan menu -- sablon menusundeki (`SablonMenusu`) Duzenle /
 * Sil secenekleri ve silmenin yerinde onayi (`DuzenleSilSecenekleri`), gecmis panelinin ustundeki
 * katmanda (`GecmisKatmani`).
 *
 * Duzenle, menunun yerinde antrenman ekranindaki `SetDuzenleyici`yi acar (silme orada yok -- tek yol
 * menudeki onayli Sil). Sunucu bitmis antrenmanin setini de duzeltir/siler ve rekorlari yeniden
 * hesaplar; gecmis ve rekorlar `setDegistiTazele` ile tazelenir, panel guncel oturumu listeden alir.
 */
export default function GecmisSetMenusu({ kayit, sira, onKapat }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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
    <GecmisKatmani onKapat={onKapat} icerikAnahtari={duzenleniyor ? 'duzenle' : 'menu'}>
      {duzenleniyor ? (
        <SetDuzenleyici kayit={kayit} sira={sira} onKapat={onKapat} />
      ) : (
        <View testID="set-menusu" className="overflow-hidden rounded-2xl">
          <CamKatmanlari koseSinifi="rounded-2xl" />
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
        </View>
      )}
    </GecmisKatmani>
  );
}
