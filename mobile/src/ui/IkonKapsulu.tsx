import { View } from 'react-native';

interface Props {
  /** Kapsulun capi (px). Ikon bunun icinde ortalanir. */
  boyut?: number;
  children: React.ReactNode;
}

/**
 * Ikonun arkasina konan yari saydam cam kapsul (#491 Gorev 1; gorsel tasarim spec'i Karar 9). Ikonu
 * degistirmez, yalnizca altina yuzey koyar; blur yok. Yari saydamlik `fg`'nin tam opak rengi + KATMANIN
 * opakligidir (`bg-fg/10` gibi ekler `var(--color-*)` renkte kenari siyah cizer), bu yuzden yeni bir
 * token gerekmez ve `fg` iki temada da dogru tonu verir.
 */
export default function IkonKapsulu({ boyut = 32, children }: Props) {
  return (
    <View
      testID="ikon-kapsulu"
      className="shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: boyut, height: boyut }}
    >
      <View testID="ikon-kapsulu-dolgu" pointerEvents="none" className="absolute inset-0 bg-fg opacity-10" />
      <View
        testID="ikon-kapsulu-kenar"
        pointerEvents="none"
        className="absolute inset-0 rounded-full border border-fg opacity-10"
      />
      {children}
    </View>
  );
}
