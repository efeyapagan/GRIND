import { View, Text, TextInput, type TextInputProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ikonRenk } from './renkler';

export interface AlanProps extends TextInputProps {
  id: string;
  etiket: string;
  ikon: LucideIcon;
  ipucu?: string;
  hata?: string;
  // Girdinin sagina bindirilen ek (orn. sifre goster dugmesi).
  sagEk?: React.ReactNode;
}

/**
 * Giris/kayit alani (spec, ortak auth duzeni): etiket ustte, solda sus ikonu, altta ipucu ve hata.
 */
export default function Alan({ id, etiket, ikon: Ikon, ipucu, hata, sagEk, ...girdi }: AlanProps) {
  return (
    <View className="flex flex-col gap-1">
      <Text nativeID={`${id}-etiket`} className="text-label text-fg">
        {etiket}
      </Text>
      <View className="relative flex-row items-center">
        <View className="pointer-events-none absolute left-3 z-10">
          <Ikon color={ikonRenk.muted} size={20} />
        </View>
        <TextInput
          nativeID={id}
          testID={id}
          accessibilityLabel={etiket}
          accessibilityLabelledBy={`${id}-etiket`}
          placeholderTextColor={ikonRenk.muted}
          {...girdi}
          className={`h-12 w-full rounded-xl bg-surface-2 pl-10 text-body text-fg focus:bg-surface-3 ${
            sagEk ? 'pr-12' : 'pr-4'
          }`}
        />
        {sagEk && <View className="absolute right-0.5">{sagEk}</View>}
      </View>
      {ipucu && <Text className="pl-1 text-label text-muted">{ipucu}</Text>}
      {hata && (
        <Text accessibilityRole="alert" className="pl-1 text-label text-danger">
          {hata}
        </Text>
      )}
    </View>
  );
}
