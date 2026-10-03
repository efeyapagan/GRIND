import { View } from 'react-native';
import { useCevrimdisi } from './BaglantiSaglayici';
import CevrimdisiUyari from './CevrimdisiUyari';

/**
 * #174: onbellekten gosterilmeyen bir bolumu sarar. Cevrimdisiyken icerik HIC baglanmaz -- sorgulari
 * calismaz, sunucuya istek gitmez -- yerine "Internete baglan" uyarisi cizilir.
 */
export default function CevrimdisiKapisi({
  children,
  className = 'px-4 pt-4',
}: {
  children: React.ReactNode;
  /** Uyarinin cevresindeki bosluk; ekranin kendi duzenine uysun diye cagiran verir. */
  className?: string;
}) {
  if (useCevrimdisi()) {
    return (
      <View className={className}>
        <CevrimdisiUyari />
      </View>
    );
  }
  return <>{children}</>;
}
