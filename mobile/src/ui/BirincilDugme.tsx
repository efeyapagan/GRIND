import { Pressable, Text, type PressableProps } from 'react-native';

const YUKSEKLIK = { buyuk: 'h-14', normal: 'h-13' } as const;

interface Props extends PressableProps {
  yukseklik: keyof typeof YUKSEKLIK;
  children: React.ReactNode;
}

/** Accent dolgulu birincil eylem; ustundeki metin her zaman `on-accent` (spec Karar 2). */
export default function BirincilDugme({ yukseklik, children, disabled, ...dugme }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...dugme}
      className={`w-full flex-row items-center justify-center gap-2 rounded-xl bg-accent ${YUKSEKLIK[yukseklik]} ${disabled ? 'opacity-60' : ''}`}
    >
      {typeof children === 'string' ? (
        <Text className="text-body-lg font-bold text-on-accent">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
