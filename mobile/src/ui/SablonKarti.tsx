import { View, Text, Pressable } from 'react-native';
import { Link, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { ikonRenk } from './renkler';

type Props = { ad: string; hareketSayisi: number } & (
  | { href: Href }
  | {
      onPress: () => void;
      disabled?: boolean;
      /** #344: surukleme sirasinda kart parmagin altinda "kalkik" durur (kenarlik + golge). */
      kaldirilmis?: boolean;
    }
);

const Icerik = ({ ad, hareketSayisi }: { ad: string; hareketSayisi: number }) => (
  <>
    <View className="min-w-0 flex-1 flex-col gap-1">
      <Text numberOfLines={1} className="text-body-lg font-semibold text-fg">
        {ad}
      </Text>
      <Text className="text-label text-muted">{hareketSayisi} hareket</Text>
    </View>
    <ChevronRight color={ikonRenk.muted} size={20} />
  </>
);

/** web/src/ui/SablonKarti.tsx ile ayni: sablon ozeti karti. */
export default function SablonKarti(props: Props) {
  if ('href' in props) {
    return (
      <Link href={props.href} asChild>
        <Pressable className="min-h-16 w-full flex-row items-center justify-between gap-4 rounded-xl bg-surface-2 p-4">
          <Icerik ad={props.ad} hareketSayisi={props.hareketSayisi} />
        </Pressable>
      </Link>
    );
  }
  // Kenarlik SURUKLENMESE DE hep cizilir, yalnizca RENGI degisir (#261 tuzagi: ilk cizimden
  // SONRA yeni bir sinif eklemek NativeWind'i bileseni "yukseltmeye" zorluyor ve navigasyon
  // baglaminda cokuyor). Ayni sebeple kalkik kart icin golge sinifi eklenmiyor.
  const kenarlik = props.kaldirilmis ? 'border-accent' : 'border-transparent';
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      className={`min-h-16 w-full flex-row items-center justify-between gap-4 rounded-xl border bg-surface-2 p-4 ${kenarlik} ${props.disabled ? 'opacity-60' : ''}`}
    >
      <Icerik ad={props.ad} hareketSayisi={props.hareketSayisi} />
    </Pressable>
  );
}
