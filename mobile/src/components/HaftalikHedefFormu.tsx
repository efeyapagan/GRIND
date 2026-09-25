import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useGuncelTakvimOzeti, useSetWeeklyTarget } from '@grind/shared/api/queries';
import EkranKaydirici from '../ui/EkranKaydirici';
import BirincilDugme from '../ui/BirincilDugme';
import { TABBAR_HALKA_TASMASI } from '../ui/KabukTabBar';

const HEDEF_GUNLERI = [1, 2, 3, 4, 5, 6, 7];

/**
 * Haftalik antrenman hedefi ekrani (#324, kullanicinin referans gorseli): ustte soru, altinda yuvarlak
 * secenekler (1-7 gun ve "Hedef yok"), en altta Kaydet. Ana sayfadaki "Haftalik hedef" karti ve hesap
 * ayarlarindaki satir ayni ekrani acar -- eski modal secici kalkti.
 *
 * Referanstaki siyah secili kenar koyu temada `fg`'dir; secim accent ALMAZ (spec'in accent kurali).
 * `secim` `undefined` iken kullanici henuz bir sey secmemistir ve sunucudaki hedef gosterilir --
 * boylece ozet ekrandan sonra yuklense de secili satir dogru gelir.
 */
export default function HaftalikHedefFormu() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: ozet, isError } = useGuncelTakvimOzeti();
  const hedefAyarla = useSetWeeklyTarget();
  const hedef = ozet?.weeklyTargetDays ?? null;
  const [secim, setSecim] = useState<number | null | undefined>(undefined);
  const gosterilen = secim === undefined ? hedef : secim;
  const kaydedilemez = !ozet || secim === undefined || secim === hedef || hedefAyarla.isPending;

  function kaydet() {
    hedefAyarla.mutate(gosterilen, { onSuccess: () => router.back() });
  }

  return (
    <EkranKaydirici contentContainerClassName="flex-grow gap-6 px-4 pt-6 pb-4">
      <Text className="text-center text-title font-bold text-fg">{t('profil.hedefSorusu')}</Text>

      <View accessibilityRole="radiogroup" className="flex-col gap-3">
        {HEDEF_GUNLERI.map((gun) => (
          <HedefSecenegi
            key={gun}
            etiket={t('profil.gunSayisi', { count: gun })}
            secili={gosterilen === gun}
            onPress={() => setSecim(gun)}
          />
        ))}
        <HedefSecenegi etiket={t('profil.hedefYok')} secili={gosterilen === null} onPress={() => setSecim(null)} />
      </View>

      {isError && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {t('profil.hedefAlinamadi')}
        </Text>
      )}
      {hedefAyarla.isError && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {t('profil.hedefKaydedilemedi')}
        </Text>
      )}

      <View className="mt-auto w-full" style={{ marginBottom: TABBAR_HALKA_TASMASI }}>
        <BirincilDugme yukseklik="buyuk" disabled={kaydedilemez} onPress={kaydet}>
          {t('ortak.kaydet')}
        </BirincilDugme>
      </View>
    </EkranKaydirici>
  );
}

function HedefSecenegi({ etiket, secili, onPress }: { etiket: string; secili: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: secili }}
      onPress={onPress}
      className={`h-14 flex-row items-center justify-between rounded-full border-2 bg-surface-1 px-6 ${
        secili ? 'border-fg' : 'border-surface-3'
      }`}
    >
      <Text className={`text-body-lg ${secili ? 'font-bold text-fg' : 'text-muted'}`}>{etiket}</Text>
      <View
        className={`size-6 items-center justify-center rounded-full border-2 ${secili ? 'border-fg' : 'border-muted'}`}
      >
        {secili && <View className="size-3 rounded-full bg-fg" />}
      </View>
    </Pressable>
  );
}
