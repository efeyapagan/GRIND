import { View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import SekmeDugmesi from '../ui/SekmeDugmesi';

export interface ProfilSekmesi {
  to: string;
  etiketAnahtari: 'kabuk.sekmeGecmis' | 'kabuk.sekmeRekorlar' | 'kabuk.sekmeOlcumler';
  ikon: LucideIcon;
}

/** web/src/components/ProfilSekmeleri.tsx ile ayni (#283/#284): kendi profilin ve arkadasinki ortak. */
export default function ProfilSekmeleri({ sekmeler }: { sekmeler: readonly ProfilSekmesi[] }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View className="flex-row border-b border-surface-3">
      {sekmeler.map(({ to, etiketAnahtari, ikon }) => (
        <SekmeDugmesi key={to} ikon={ikon} secili={pathname === to} onPress={() => router.navigate(to)}>
          {t(etiketAnahtari)}
        </SekmeDugmesi>
      ))}
    </View>
  );
}
