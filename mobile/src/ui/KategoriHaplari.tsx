import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { EgzersizKategorisi } from '@grind/shared/api/queries';

/**
 * Kategori haplari. Etiket katalogdan gelir (`antrenman.kategori.*`): Push/Pull/Legs Ingilizce
 * kategori adlaridir ve iki dilde de ayni, "Diğer" ve "Tümü" cevrilir.
 */
const KATEGORILER: (EgzersizKategorisi | null)[] = [null, 'Push', 'Pull', 'Legs', 'Other'];

interface Props {
  secili: EgzersizKategorisi | null;
  onSec: (kategori: EgzersizKategorisi | null) => void;
  /** Haplari saran satirin sinifi -- acilir listede yapiskan baslik, pencerede duz satir. */
  className?: string;
}

/** Hareket aramasinin kategori suzgeci; `HareketSecici` ve `HareketSecimKutusu` ortak (#586). */
export default function KategoriHaplari({ secili, onSec, className = '' }: Props) {
  const { t } = useTranslation();
  return (
    <View className={`flex-row flex-wrap gap-1 ${className}`}>
      {KATEGORILER.map((deger) => (
        <Pressable
          key={deger ?? 'tumu'}
          accessibilityState={{ selected: secili === deger }}
          onPress={() => onSec(deger)}
          className={`min-h-11 items-center justify-center rounded-full px-3 ${secili === deger ? 'bg-surface-4' : ''}`}
        >
          <Text className={`text-label ${secili === deger ? 'text-fg' : 'text-muted'}`}>
            {deger === null ? t('antrenman.kategoriTumu') : t(`antrenman.kategori.${deger}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
