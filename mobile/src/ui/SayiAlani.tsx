import { forwardRef } from 'react';
import { View, Text, TextInput, type TextInput as TextInputType } from 'react-native';
import { useIkonRenk } from './renkler';

interface Props {
  id: string;
  etiket: string;
  birim: string;
  inputMode: 'decimal' | 'numeric';
  placeholder: string;
  value: string;
  onChange: (deger: string) => void;
  hata?: string;
}

/**
 * Set girisinin kompakt sayi alani (set paneli ve set duzenleyici ortak, #57). Girdi kutunun
 * TAMAMIDIR; etiket ve birim onun ustune bindirilir.
 */
const SayiAlani = forwardRef<TextInputType, Props>(function SayiAlani(
  { id, etiket, birim, inputMode, placeholder, value, onChange, hata },
  ref,
) {
  const ikonRenk = useIkonRenk();
  return (
    <View className="flex flex-col gap-1">
      <View className="relative">
        <TextInput
          ref={ref}
          nativeID={id}
          testID={id}
          accessibilityLabel={etiket}
          inputMode={inputMode}
          keyboardType={inputMode === 'decimal' ? 'decimal-pad' : 'number-pad'}
          placeholder={placeholder}
          placeholderTextColor={`${ikonRenk.muted}66`}
          value={value}
          onChangeText={onChange}
          className="h-15 w-full rounded-lg bg-inset pt-5 pr-12 pl-2 text-heading text-fg"
        />
        <Text className="pointer-events-none absolute top-2 left-2 text-label-xs text-muted uppercase">
          {etiket}
        </Text>
        <Text className="pointer-events-none absolute right-2 bottom-2.5 text-label-xs text-muted">
          {birim}
        </Text>
      </View>
      {hata && (
        <Text accessibilityRole="alert" className="text-label text-danger">
          {hata}
        </Text>
      )}
    </View>
  );
});

export default SayiAlani;
