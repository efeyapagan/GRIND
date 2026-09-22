import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { renkler } from '@grind/shared/designTokens';

interface Props {
  boyut?: number;
  /** Yaninda zaten GRINDY yazan bir metin varsa (orn. bir baglanti) ekran okuyucudan gizlenir. */
  dekoratif?: boolean;
}

/**
 * web/src/ui/GrindyMaskot.tsx ile ayni cizim (issue #239). SVG className'den renk alamadigi icin
 * (bkz. renkler.ts) renkler token'lardan dogrudan okunur.
 */
export default function GrindyMaskot({ boyut = 56, dekoratif = false }: Props) {
  const { t } = useTranslation();
  const govde = renkler.accent;
  const yuz = renkler['on-accent'];
  return (
    <View
      {...(dekoratif
        ? { importantForAccessibility: 'no-hide-descendants' as const, accessibilityElementsHidden: true }
        : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: t('yorumlar.maskotEtiketi') })}
    >
      <Svg viewBox="0 0 64 64" width={boyut} height={boyut}>
        <Path d="M22 26V17a10 10 0 0 1 20 0v9" fill="none" stroke={govde} strokeWidth={6} strokeLinecap="round" />
        <Ellipse cx={32} cy={41} rx={22} ry={20} fill={govde} />
        <Ellipse cx={24} cy={38} rx={3} ry={4} fill={yuz} />
        <Ellipse cx={40} cy={38} rx={3} ry={4} fill={yuz} />
        <Circle cx={25} cy={36.5} r={1} fill={govde} />
        <Circle cx={41} cy={36.5} r={1} fill={govde} />
        <Circle cx={18} cy={45} r={3} opacity={0.25} fill={yuz} />
        <Circle cx={46} cy={45} r={3} opacity={0.25} fill={yuz} />
        <Path d="M26 47q6 5 12 0" fill="none" stroke={yuz} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
    </View>
  );
}
