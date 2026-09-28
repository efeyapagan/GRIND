import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSharedTemplate, useSaveSharedTemplate } from '@grind/shared/api/queries';
import BirincilDugme from '../../../../../../src/ui/BirincilDugme';
import HataKutusu from '../../../../../../src/ui/HataKutusu';
import { useAltMenuPayi } from '../../../../../../src/ui/KabukTabBar';

/**
 * #467: arkadaşın şablonunun salt-okunur görünümü -- kendi düzenleme formunu (SablonFormu)
 * KULLANMAZ, bu başkasının şablonu. "Şablonu kaydet" kendi hesabına anlık görüntü kopyalar.
 */
export default function PaylasilanSablonDetayEkrani() {
  const altMenuPayi = useAltMenuPayi();
  const { t } = useTranslation();
  const router = useRouter();
  const { username: ad = '', id } = useLocalSearchParams<{ username: string; id: string }>();
  const templateId = Number(id);
  const { data: sablon, isLoading, isError } = useSharedTemplate(ad, templateId);
  const kaydetMutasyonu = useSaveSharedTemplate(ad);
  const [kaydetHatasi, setKaydetHatasi] = useState<string | null>(null);

  async function kaydet() {
    setKaydetHatasi(null);
    try {
      await kaydetMutasyonu.mutateAsync(templateId);
      router.push('/(tabs)' as never);
    } catch {
      setKaydetHatasi(t('sablonlar.sablonKaydedilemedi'));
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}
      {isError && <HataKutusu baslik={t('sablonlar.tekilHata')} mesaj={t('sablonlar.arkadasSablonlariAlinamadi')} />}
      {sablon && (
        <>
          <BirincilDugme yukseklik="normal" disabled={kaydetMutasyonu.isPending} onPress={kaydet}>
            {t('sablonlar.sablonuKaydet')}
          </BirincilDugme>
          {kaydetHatasi && <HataKutusu baslik={t('sablonlar.sablonKaydedilemedi')} mesaj={kaydetHatasi} />}

          <Text className="text-heading font-bold text-fg">{sablon.name}</Text>
          <View className="flex-col gap-3">
            {sablon.exercises.map((hareket) => (
              <View key={hareket.exerciseId} className="rounded-xl border border-surface-4 bg-surface-2 p-4">
                <Text className="text-body-lg text-fg">{hareket.exerciseName}</Text>
                <Text className="text-label text-muted">
                  {t('sablonlar.hareketSayisi', { count: hareket.plannedSets })}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
