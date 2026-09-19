import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import { useTemplates } from '@grind/shared/api/queries';
import SablonKarti from '../ui/SablonKarti';

interface Props {
  onBasla: (templateId: number) => void;
  bekliyor: boolean;
}

/** web/src/components/SablonlaBasla.tsx ile ayni (spec Karar 2 ve 4). */
export default function SablonlaBasla({ onBasla, bekliyor }: Props) {
  const { data: sablonlar, isLoading, isError } = useTemplates();

  return (
    <View className="flex-col gap-3">
      <Text className="text-heading text-fg">Şablonla başla</Text>

      {isLoading && <Text className="text-body text-muted">Yükleniyor...</Text>}
      {isError && (
        <Text accessibilityRole="alert" className="text-body text-danger">
          Şablonlar alınamadı.
        </Text>
      )}

      {sablonlar && sablonlar.length === 0 && <Text className="text-body text-muted">Henüz şablon yok.</Text>}

      {sablonlar && sablonlar.length > 0 && (
        <>
          <View className="flex-col gap-2">
            {sablonlar.map((sablon) => (
              <SablonKarti
                key={sablon.id}
                ad={sablon.name}
                hareketSayisi={sablon.exercises.length}
                onPress={() => onBasla(sablon.id)}
                disabled={bekliyor}
              />
            ))}
          </View>
          <Link href="/templates" className="min-h-11 text-label text-muted underline">
            Şablonları yönet
          </Link>
        </>
      )}
    </View>
  );
}
