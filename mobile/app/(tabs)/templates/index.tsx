import { View, Text, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { ClipboardList, Plus } from 'lucide-react-native';
import { useTemplates } from '@grind/shared/api/queries';
import { usePageTitle } from '@grind/shared/pageTitle';
import BosDurum from '../../../src/ui/BosDurum';
import BirincilDugme from '../../../src/ui/BirincilDugme';
import SablonKarti from '../../../src/ui/SablonKarti';
import { ikonRenk } from '../../../src/ui/renkler';

/** web/src/pages/SablonlarPage.tsx ile ayni (spec Karar 3). */
export default function SablonlarScreen() {
  usePageTitle('Şablonlar');
  const { data: sablonlar, isLoading, isError } = useTemplates();

  return (
    <ScrollView contentContainerClassName="gap-5 px-4 pt-2 pb-4">
      {isLoading && <Text className="text-body text-muted">Yükleniyor...</Text>}

      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          Şablonlar alınamadı. Lütfen sayfayı yenileyin.
        </Text>
      )}

      {sablonlar && sablonlar.length === 0 && (
        <BosDurum
          ikon={ClipboardList}
          baslik="Henüz şablon yok"
          aciklama="Bir gün tipinin hareketlerini bir kez kur, antrenmanı tek dokunuşla başlat."
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
          <Text className="text-body-lg font-bold text-on-accent">Yeni şablon</Text>
        </BirincilDugme>
      </Link>
    </ScrollView>
  );
}
