import { Pressable, Text, type PressableProps } from 'react-native';

interface Props extends PressableProps {
  children: React.ReactNode;
}

/** Notr ikincil eylem (ör. "Hareket ekle", "Vazgec"); accent YOK. */
export default function IkincilDugme({ children, disabled, ...dugme }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...dugme}
      className={`h-12 w-full flex-row items-center justify-center gap-2 rounded-xl bg-surface-3 px-4 ${disabled ? 'opacity-60' : ''}`}
    >
      {typeof children === 'string' ? <Text className="text-label text-fg">{children}</Text> : children}
    </Pressable>
  );
}
