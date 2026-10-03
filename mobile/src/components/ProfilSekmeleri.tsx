import { View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Rect } from 'react-native-svg';
import SekmeDugmesi from '../ui/SekmeDugmesi';
import { useRenkPaleti } from '../ui/renkler';

export interface ProfilSekmesi {
  to: string;
  etiketAnahtari: 'kabuk.sekmeGecmis' | 'kabuk.sekmeRekorlar' | 'kabuk.sekmeOlcumler' | 'kabuk.sekmeSablonlar' | 'kabuk.sekmeIlerleme';
  ikon: LucideIcon;
}

/** web/src/components/ProfilSekmeleri.tsx ile ayni (#283/#284): kendi profilin ve arkadasinki ortak. */
export default function ProfilSekmeleri({ sekmeler }: { sekmeler: readonly ProfilSekmesi[] }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const palet = useRenkPaleti();

  return (
    <View testID="profil-sekmeleri" className="flex-row">
      {/* #591: alt cizgi NativeWind kenarligi degil SVG sac teli (spec Karar 9; `fg` %12). Sekmelerin
          altinda, secili sekmenin accent cizgisi bunun USTUNDE kalir. */}
      <View pointerEvents="none" className="absolute inset-x-0 bottom-0 h-px">
        <Svg testID="profil-sekmeleri-cizgi" width="100%" height="100%">
          <Rect width="100%" height="100%" fill={palet.fg} fillOpacity={0.12} />
        </Svg>
      </View>
      {sekmeler.map(({ to, etiketAnahtari, ikon }) => (
        <SekmeDugmesi key={to} ikon={ikon} secili={pathname === to} onPress={() => router.navigate(to)}>
          {t(etiketAnahtari)}
        </SekmeDugmesi>
      ))}
    </View>
  );
}
