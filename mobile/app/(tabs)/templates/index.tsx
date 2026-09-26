import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link } from 'expo-router';
import { ClipboardList, Plus } from 'lucide-react-native';
import { useTemplates } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import BosDurum from '../../../src/ui/BosDurum';
import BirincilDugme from '../../../src/ui/BirincilDugme';
import SablonKarti from '../../../src/ui/SablonKarti';
import { useIkonRenk } from '../../../src/ui/renkler';
import { useAltMenuPayi } from '../../../src/ui/KabukTabBar';

/** web/src/pages/SablonlarPage.tsx ile ayni (spec Karar 3). */
export default function SablonlarScreen() {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const altMenuPayi = useAltMenuPayi();
  usePageTitle(t('sablonlar.baslik'));
  const { data: sablonlar, isLoading, isError } = useTemplates();

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2" contentContainerStyle={{ paddingBottom: altMenuPayi }}>
      {isLoading && <Text className="text-body text-muted">{t('ortak.yukleniyor')}</Text>}

      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {t('sablonlar.hataYenile')}
        </Text>
      )}

      {sablonlar && sablonlar.length === 0 && (
        <BosDurum
          ikon={ClipboardList}
          baslik={t('sablonlar.hicSablonYokBaslik')}
          aciklama={t('sablonlar.hicSablonYokAciklama')}
        />
      )}

      {sablonlar && sablonlar.length > 0 && (
        <View className="flex-col gap-3">
          {sablonlar.map((sablon) => (
            <SablonKarti
              key={sablon.id}
              ad={sablon.name}
              hareketSayisi={sablon.exercises.length}
              href={`/templates/${sablon.id}`}
            />
          ))}
        </View>
      )}

      <Link href="/templates/new" asChild>
        <BirincilDugme yukseklik="normal">
          <Plus color={ikonRenk.onAccent} size={20} />
          <Text className="text-body-lg font-bold text-on-accent">{t('sablonlar.yeniSablon')}</Text>
        </BirincilDugme>
      </Link>
    </ScrollView>
  );
}
