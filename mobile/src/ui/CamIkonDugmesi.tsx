import CamKart from './CamKart';

interface Props {
  /** Yalnizca ikondan olusan dugmenin erisilebilir adi (zorunlu). */
  etiket: string;
  onPress: () => void;
  children: React.ReactNode;
}

/**
 * `IkonDugmesi`nin cam hali (#547, gorsel tasarim spec'i Karar 9): 44 px, `CamKart` yuzeyi -- blur,
 * ustten sonen parilti, sac teli kenar. Ilk kullanim ana sayfa takviminin gorunum tusu. `IkonDugmesi`
 * 22 yerde kullanildigi icin yerinde degistirilmedi; cam dile gecen dugmeler bunu kullanir.
 */
export default function CamIkonDugmesi({ etiket, onPress, children }: Props) {
  return (
    <CamKart
      onPress={onPress}
      accessibilityLabel={etiket}
      disClassName="size-11"
      className="size-11 items-center justify-center"
    >
      {children}
    </CamKart>
  );
}
