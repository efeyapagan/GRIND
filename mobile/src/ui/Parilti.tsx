import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { renkler } from '@grind/shared/designTokens';

interface Props {
  /** `alt`: sekmenin alt cizgisinden yukari sonen serit. `daire`: ikonun arkasinda disa sonen hale. */
  bicim: 'alt' | 'daire';
}

const DAIRE_BOYUTU = 48;

/**
 * web/src/ui/Parilti.tsx'in RN karsiligi (issue #243): aktif ogenin `accent`ten saydama sonen
 * turuncu parlamasi. NativeWind degrade sinifi tasimadigi icin `react-native-svg` ile cizilir.
 * Saf dekorasyon: dokunmayi yutmaz, erisilebilirlik agacina girmez. Ebeveyn icerigi (ikon/metin)
 * bundan SONRA gelmeli ki parilti onun altinda kalsin.
 */
export default function Parilti({ bicim }: Props) {
  // useId ':' gibi karakterler uretir; `url(#...)` icinde gecersiz oldugu icin temizlenir.
  const id = `parilti${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const daire = bicim === 'daire';

  return (
    <View
      testID="parilti"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="absolute"
      style={
        daire
          ? { width: DAIRE_BOYUTU, height: DAIRE_BOYUTU, left: '50%', top: '50%', marginLeft: -DAIRE_BOYUTU / 2, marginTop: -DAIRE_BOYUTU / 2 }
          : { left: 0, right: 0, top: 0, bottom: 0 }
      }
    >
      <Svg width="100%" height="100%">
        <Defs>
          {daire ? (
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={renkler.accent} stopOpacity={0.3} />
              <Stop offset="0.7" stopColor={renkler.accent} stopOpacity={0} />
            </RadialGradient>
          ) : (
            <LinearGradient id={id} x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={renkler.accent} stopOpacity={0.2} />
              <Stop offset="1" stopColor={renkler.accent} stopOpacity={0} />
            </LinearGradient>
          )}
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
