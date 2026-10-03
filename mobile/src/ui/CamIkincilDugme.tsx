import { Text } from 'react-native';
import CamKart from './CamKart';

interface Props {
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * `IkincilDugme`nin cam hali (#589, gorsel tasarim spec'i Karar 9): ayni olcu (`h-12 rounded-xl`), duz
 * `surface-3` yerine `CamKart` yuzeyi. `IkincilDugme` yerinde degistirilmedi: kullanildigi yerlerin bir
 * kismi zaten cam kartin icinde (`SetDuzenleyici`, `PaylasimPenceresi`), orada cam ustune cam olurdu --
 * `CamIkonDugmesi` ile ayni gerekce. Ilk kullanim antrenman ekranindaki "Bos antrenman baslat".
 */
export default function CamIkincilDugme({ onPress, disabled = false, children }: Props) {
  return (
    <CamKart
      onPress={onPress}
      disabled={disabled}
      koseSinifi="rounded-xl"
      disClassName="w-full"
      className="h-12 flex-row items-center justify-center gap-2 px-4"
    >
      {typeof children === 'string' ? <Text className="text-label text-fg">{children}</Text> : children}
    </CamKart>
  );
}
