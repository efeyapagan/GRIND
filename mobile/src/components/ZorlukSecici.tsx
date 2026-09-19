import { View, Text, Pressable } from 'react-native';
import type { Zorluk } from '@grind/shared/api/queries';

interface Props {
  onSec: (zorluk: Zorluk | null) => void;
  bekliyor: boolean;
}

const SECENEKLER: { deger: Zorluk; etiket: string }[] = [
  { deger: 'Easy', etiket: 'Kolay' },
  { deger: 'Medium', etiket: 'Orta' },
  { deger: 'Hard', etiket: 'Zor' },
];

/** web/src/components/ZorlukSecici.tsx ile ayni (#118). */
export default function ZorlukSecici({ onSec, bekliyor }: Props) {
  return (
    <View className="flex-row flex-wrap items-center justify-end gap-2">
      <Text className="text-label text-muted">Nasıl geçti?</Text>
      {SECENEKLER.map(({ deger, etiket }) => (
        <Pressable
          key={deger}
          onPress={() => onSec(deger)}
          disabled={bekliyor}
          className={`min-h-11 items-center justify-center rounded-full bg-surface-3 px-4 ${bekliyor ? 'opacity-60' : ''}`}
        >
          <Text className="text-label text-fg">{etiket}</Text>
        </Pressable>
      ))}
      <Pressable
        onPress={() => onSec(null)}
        disabled={bekliyor}
        className={`min-h-11 items-center justify-center rounded-lg px-2 ${bekliyor ? 'opacity-60' : ''}`}
      >
        <Text className="text-label text-muted">Atla</Text>
      </Pressable>
    </View>
  );
}
