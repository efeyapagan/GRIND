import { useState } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, type LucideIcon } from 'lucide-react-native';
import Alan, { type AlanProps } from './Alan';
import { useIkonRenk } from './renkler';

type Props = Omit<AlanProps, 'secureTextEntry' | 'sagEk' | 'ikon'> & {
  ikon?: LucideIcon;
  gosterEtiketi?: string;
};

/** Sifre alani + goster/gizle dugmesi (spec davranis 2). */
export default function SifreAlani({ ikon = Lock, gosterEtiketi, ...alan }: Props) {
  const { t } = useTranslation();
  const ikonRenk = useIkonRenk();
  const gosterEtiketiMetni = gosterEtiketi ?? t('ortak.sifreyiGoster');
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
          accessibilityLabel={gosterEtiketiMetni}
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
