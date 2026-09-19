import { Text } from 'react-native';

/**
 * Antrenman turu hapi (sablon adi ya da "Serbest"): notr, buyuk harf. `accent` KULLANILMAZ
 * (gorsel tasarim spec'i Karar 2: accent rekorlara, birincil eyleme, aktif sekmeye ve markaya ayrildi).
 */
export default function TurEtiketi({ children }: { children: React.ReactNode }) {
  return (
    <Text
      numberOfLines={1}
      className="max-w-full self-start rounded-full bg-surface-3 px-2.5 py-1 text-label text-fg uppercase"
    >
      {children}
    </Text>
  );
}
