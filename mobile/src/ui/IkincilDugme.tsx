import { Pressable, Text, type PressableProps } from 'react-native';
import CamDolgu from './CamDolgu';

interface Props extends PressableProps {
  children: React.ReactNode;
}

/**
 * Notr ikincil eylem (ör. "Hareket ekle", "Vazgec"); accent YOK.
 *
 * #591: zemin opak `surface-3` degil hafif `fg` dolgusu (`CamDolgu`) -- kullanimlarin neredeyse tamami cam
 * kartin icinde ("Vazgec"ler) ve orada opak kutu kaliyordu (#589 kullanici bulgusu). Dolgu cam degildir,
 * sayfa zemininde de calisir; sayfada TEK BASINA duran ikincil dugme ise cam olur (`CamIkincilDugme`).
 */
export default function IkincilDugme({ children, disabled, ...dugme }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...dugme}
      className={`h-12 w-full flex-row items-center justify-center gap-2 rounded-xl px-4 ${disabled ? 'opacity-60' : ''}`}
    >
      <CamDolgu opaklik={0.1} yaricap={12} />
      {typeof children === 'string' ? <Text className="text-label text-fg">{children}</Text> : children}
    </Pressable>
  );
}
