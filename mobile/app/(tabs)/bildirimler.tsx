import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react-native';
import { useBildirimler, useBildirimleriGorulduYap } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import BosDurum from '../../src/ui/BosDurum';
import BildirimSatiri from '../../src/components/BildirimSatiri';
import { useAltMenuPayi } from '../../src/ui/KabukTabBar';

/**
 * Ana sayfanin sag ustundeki zilin actigi ekran (#324, #325). Liste geldikten sonra "goruldu" BIR KEZ
 * gider: okunmamis vurgular bu ziyaret boyunca kalir, zil rozeti sifirlanir. Liste alinamadiysa gitmez --
 * gorulmemis bildirim okundu sayilmasin. Geri dugmesi kabuktan gelir (`altEkranMi`).
 */
export default function BildirimlerScreen() {
  const altMenuPayi = useAltMenuPayi();
  const { t } = useTranslation();
  usePageTitle(t('ortak.bildirimler'));
  const { data, isLoading, isError, refetch } = useBildirimler();
  const { mutate: gorulduYap } = useBildirimleriGorulduYap();
  const gorulduGitti = useRef(false);

  useEffect(() => {
    if (data && !gorulduGitti.current) {
      gorulduGitti.current = true;
      gorulduYap();
    }
  }, [data, gorulduYap]);

  return (
    <ScrollView contentContainerClassName="gap-3 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}

      {isError && (
        <View className="flex-col items-start gap-2">
          <Text accessibilityRole="alert" className="text-body text-danger">
            {t('bildirimler.alinamadi')}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void refetch()} className="min-h-11 justify-center">
            <Text className="text-label text-accent-soft">{t('bildirimler.tekrarDene')}</Text>
          </Pressable>
        </View>
      )}

      {data && data.length === 0 && (
        <BosDurum ikon={Bell} baslik={t('bildirimler.bos')} aciklama={t('bildirimler.bosAciklama')} />
      )}

      {data?.map((bildirim) => (
        <BildirimSatiri key={`${bildirim.kind}-${bildirim.actor.username}-${bildirim.occurredAt}`} bildirim={bildirim} />
      ))}
    </ScrollView>
  );
}
