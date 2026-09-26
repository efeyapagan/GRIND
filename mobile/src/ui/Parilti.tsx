import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useRenkPaleti } from './renkler';


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
  const palet = useRenkPaleti();
  // useId ':' gibi karakterler uretir; `url(#...)` icinde gecersiz oldugu icin temizlenir.
  const id = `parilti${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const daire = bicim === 'daire';

  return (
    <View
      testID="parilti"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // Ebeveyni kaplar ve daireyi ortalar (#252): `left: '50%'` + negatif margin cihazda ikonun
      // sagina kayiyordu; kaplayip ortalamak yuzde/margin hesabina dayanmaz.
      className="absolute inset-0 items-center justify-center"
    >
      <Svg
        width={daire ? DAIRE_BOYUTU : '100%'}
        height={daire ? DAIRE_BOYUTU : '100%'}
      >
        <Defs>
          {daire ? (
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={palet.accent} stopOpacity={0.3} />
              <Stop offset="0.7" stopColor={palet.accent} stopOpacity={0} />
            </RadialGradient>
          ) : (
            <LinearGradient id={id} x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={palet.accent} stopOpacity={0.2} />
              <Stop offset="1" stopColor={palet.accent} stopOpacity={0} />
            </LinearGradient>
          )}
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
