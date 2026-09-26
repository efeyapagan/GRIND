import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useIkonRenk } from './renkler';

// Ikon RENGI burada degil, bilesenin icinde cozulur: modul seviyesinde okunursa temaya gore
// degismez (#271 -- ilk denemede ikonlar acik temada koyu tema renginde kalmisti).
const TON = {
  dolu: { kutu: 'bg-accent', yazi: 'text-on-accent', ikon: 'onAccent' },
  acik: { kutu: 'bg-accent/20', yazi: 'text-accent-soft', ikon: 'accentSoft' },
} as const;

interface Props {
  children: React.ReactNode;
  ton?: keyof typeof TON;
  ikon?: LucideIcon;
  tamYuvarlak?: boolean;
}

/** Rozet: web'deki `uppercase` CSS'i karsiligi olarak metin burada elle buyuk harfe cevrilmez --
 * cagiran taraf zaten buyuk harfli metin geçiyor (RecordType gibi sabit degerler); tutarliligi
 * korumak icin `textTransform: 'uppercase'` stiliyle web'deki davranis birebir eslenir. */
export default function Rozet({ children, ton = 'dolu', ikon: Ikon, tamYuvarlak = false }: Props) {
  const ikonRenk = useIkonRenk();
  const stil = TON[ton];
  return (
    <View
      className={`flex-row items-center gap-1 px-2 py-0.5 ${stil.kutu} ${tamYuvarlak ? 'rounded-full' : 'rounded'}`}
    >
      {Ikon && <Ikon color={ikonRenk[stil.ikon]} size={12} />}
      <Text className={`text-label-xs uppercase ${stil.yazi}`}>{children}</Text>
    </View>
  );
}
