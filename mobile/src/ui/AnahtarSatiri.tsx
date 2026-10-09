import { Platform, Switch, View, Text } from 'react-native';
import { useRenkPaleti } from './renkler';

interface Props {
  etiket: string;
  /** Anahtarin ne yaptigini anlatan satir; `hata` doluyken onun yerine hata gosterilir. */
  aciklama?: string;
  hata?: string | null;
  deger: boolean;
  onDegistir: (deger: boolean) => void;
  disabled?: boolean;
}

/**
 * Ac/kapa ayar satiri (#414'te dinlenme ziliyle geldi, #410'da bildirim kategorileriyle ortaklasti): solda
 * etiket, sagda anahtar, altinda aciklama ya da hata. Renkler paletten gelir -- Android'in varsayilan topu
 * sistem yesilidir, iOS'un beyaz topu oldugu gibi kalir.
 */
export default function AnahtarSatiri({ etiket, aciklama, hata, deger, onDegistir, disabled }: Props) {
  const palet = useRenkPaleti();

  return (
    <View className="flex-col gap-1">
      <View className="min-h-12 flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-body-lg text-fg">{etiket}</Text>
        <Switch
          accessibilityLabel={etiket}
          value={deger}
          onValueChange={onDegistir}
          disabled={disabled}
          trackColor={{ true: palet.accent, false: palet['surface-3'] }}
          thumbColor={Platform.OS === 'android' ? (deger ? palet['on-accent'] : palet.muted) : undefined}
        />
      </View>
      {hata ? (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {hata}
        </Text>
      ) : (
        aciklama !== undefined && <Text className="text-label text-muted">{aciklama}</Text>
      )}
    </View>
  );
}
