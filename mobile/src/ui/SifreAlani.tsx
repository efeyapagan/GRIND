import { useState } from 'react';
import { Pressable } from 'react-native';
import { Eye, EyeOff, Lock, type LucideIcon } from 'lucide-react-native';
import Alan, { type AlanProps } from './Alan';
import { ikonRenk } from './renkler';

type Props = Omit<AlanProps, 'secureTextEntry' | 'sagEk' | 'ikon'> & {
  ikon?: LucideIcon;
  gosterEtiketi?: string;
};

/** Sifre alani + goster/gizle dugmesi (spec davranis 2). */
export default function SifreAlani({ ikon = Lock, gosterEtiketi = 'Şifreyi göster', ...alan }: Props) {
  const [gorunur, setGorunur] = useState(false);
  const GozIkonu = gorunur ? EyeOff : Eye;

  return (
    <Alan
      {...alan}
      ikon={ikon}
      secureTextEntry={!gorunur}
      sagEk={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={gosterEtiketi}
          accessibilityState={{ selected: gorunur }}
          onPress={() => setGorunur((g) => !g)}
          className="size-11 items-center justify-center rounded-lg"
        >
          <GozIkonu color={ikonRenk.muted} size={20} />
        </Pressable>
      }
    />
  );
}
