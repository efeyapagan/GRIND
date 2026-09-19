import { Pressable, type PressableProps } from 'react-native';

interface Props extends PressableProps {
  // Yalnizca ikondan olusan dugmenin erisilebilir adi (zorunlu).
  etiket: string;
  children: React.ReactNode;
}

/** 44 px kare ikon dugmesi; icerige ikonRenk.muted renginde bir lucide ikonu verilir. */
export default function IkonDugmesi({ etiket, disabled, children, ...dugme }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiket}
      disabled={disabled}
      {...dugme}
      className={`size-11 items-center justify-center rounded-lg bg-surface-3 ${disabled ? 'opacity-40' : ''}`}
    >
      {children}
    </Pressable>
  );
}
