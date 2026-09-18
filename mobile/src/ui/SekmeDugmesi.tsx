import { Pressable, Text, type PressableProps } from 'react-native';

interface Props extends PressableProps {
  secili: boolean;
  children: React.ReactNode;
}

/** `role="tab"` deseninde tek sekme: aktif sekmenin alt cizgisi `accent`, pasifler `muted`. */
export default function SekmeDugmesi({ secili, children, ...dugme }: Props) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: secili }}
      {...dugme}
      className={`min-h-11 flex-1 items-center justify-center border-b-2 px-2 ${
        secili ? 'border-accent' : 'border-transparent'
      }`}
    >
      <Text className={`text-label ${secili ? 'text-fg' : 'text-muted'}`}>{children}</Text>
    </Pressable>
  );
}
