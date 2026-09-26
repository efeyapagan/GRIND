import { Pressable, Text, type PressableProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import Parilti from './Parilti';
import { useIkonRenk } from './renkler';

interface Props extends PressableProps {
  secili: boolean;
  children: React.ReactNode;
  // #283: verilirse sekme yalnizca ikon gosterir; metin (`children`) erisilebilir etiket olur.
  ikon?: LucideIcon;
}

/**
 * `role="tab"` deseninde tek sekme: aktif sekmenin alt cizgisi `accent`, pasifler `muted`.
 * Aktif sekmede alt cizgiden yukari sonen turuncu parilti (#243).
 */
export default function SekmeDugmesi({ secili, children, ikon: Ikon, ...dugme }: Props) {
  const ikonRenk = useIkonRenk();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: secili }}
      accessibilityLabel={Ikon && typeof children === 'string' ? children : undefined}
      {...dugme}
      className={`min-h-11 flex-1 items-center justify-center border-b-2 px-2 ${
        secili ? 'border-accent' : 'border-transparent'
      }`}
    >
      {secili && <Parilti bicim="alt" />}
      {Ikon ? (
        <Ikon color={secili ? ikonRenk.fg : ikonRenk.muted} size={22} />
      ) : (
        <Text className={`text-label ${secili ? 'text-fg' : 'text-muted'}`}>{children}</Text>
      )}
    </Pressable>
  );
}
