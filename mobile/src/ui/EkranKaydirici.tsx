import { forwardRef, useEffect, useRef, useState } from 'react';
import { ScrollView, Keyboard, Platform, type ScrollViewProps } from 'react-native';
import { useAltMenuPayi } from './KabukTabBar';

/**
 * Metin alani + en altta gonder dugmesi olan HER ekranin ortak sarmalayicisi (Faz 3 sonrasi
 * simulator dokunma testinde bulundu): sarmalayici olmadan klavye acilinca `mt-auto` ile en alta
 * yaslanan bir form (antrenmanin alt alani, SablonFormu'ndaki Kaydet, vb.) klavyenin ARKASINA kayiyor --
 * gercek bir dokunusla ulasilamaz hale geliyordu. `keyboardShouldPersistTaps="handled"` olmadan
 * da klavye acikken disaridaki ilk dokunus (orn. "Kaydet") sadece klavyeyi kapatiyordu, dugmeye
 * ULASMIYORDU.
 *
 * `KeyboardAvoidingView` BILEREK KULLANILMAZ (issue #145'te bulundu): otomatik "padding"
 * davranisi kendi cercevesini (frame) olcerek gereken bosluk miktarini hesaplar, ama bu ekran
 * bir tab navigator'in icinde oldugu icin bu olcum guvenilmez cikiyordu -- klavye ~300pt
 * olmasina ragmen yalnizca ~100pt (tab bar'in kendi yuksekligine yakin bir deger, tesadufi
 * degil) bosluk aciliyordu, simulator testinde dogrulandi. Bunun yerine klavyenin GERCEK
 * yuksekligi event payload'undan (`endCoordinates.height`) dogrudan okunup ScrollView'in alt
 * dolgusuna (padding) uygulanir -- bu, herhangi bir cerceve olcumune bagli degildir ve HER ZAMAN
 * dogru sayiyi verir.
 *
 * Dolgu buyuyunce ScrollView otomatik KAYMAZ -- en alttaki form gorunsun diye elle
 * `scrollToEnd` cagirilir. Bunu DISARIDAN (ayri bir `keyboardWillShow` dinleyicisiyle) yapmak
 * YARIS DURUMUNA dusuyordu: dolgu state'i henuz native tarafa COMMIT olmadan scrollToEnd
 * cagriliyor ve hicbir sey yapmiyordu. Burada, AYNI bilesen icinde, dolgu state'i guncellendikten
 * bir sonraki tick'te (kisa bir gecikmeyle) kaydirilarak bu race ONLENIR.
 */
interface Props extends ScrollViewProps {
  /**
   * #274: klavye acilinca varsayilan davranis en alta (`scrollToEnd`) kaymaktir -- formu listenin
   * sonunda olan ekranlar icin. Formu listenin ICINDE olan ekran (antrenman: set paneli secili
   * kartin altinda) kendi hizalamasini verir; ayni gecikmeli tick'te, klavye yuksekligiyle cagrilir.
   */
  onKlavyeAcildi?: (klavyeYuksekligi: number) => void;
  /**
   * Yuzer bir alt panel (antrenman: `SetPaneli`) icerigin ustune bindiginde, son satirin panelin
   * ARKASINDA kalmamasi icin eklenen ekstra alt bosluk (px) -- web'deki `sticky` panelin kendi akis
   * icinde yer kaplamasiyla AYNI etki, burada elle verilir (panel `position: absolute`).
   */
  altBosluk?: number;
}

const EkranKaydirici = forwardRef<ScrollView, Props>(function EkranKaydirici(
  { contentContainerClassName, children, onKlavyeAcildi, altBosluk = 0, ...props },
  disariAcilanRef,
) {
  const icRef = useRef<ScrollView>(null);
  const [klavyeYuksekligi, setKlavyeYuksekligi] = useState(0);
  const altMenuPayi = useAltMenuPayi();
  // Dinleyici bir kez kurulur; en guncel geri cagrim ref uzerinden okunur.
  const klavyeAcilincaRef = useRef(onKlavyeAcildi);
  klavyeAcilincaRef.current = onKlavyeAcildi;

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    // `Will` (Did degil) kullanilir: klavye animasyonuyla ES ZAMANLI baslar, "Did" animasyon
    // bittikten sonra geldigi icin gorunur bir sicrama/gecikme yaratirdi.
    const gosterilince = Keyboard.addListener('keyboardWillShow', (e) => {
      setKlavyeYuksekligi(e.endCoordinates.height);
      const yukseklik = e.endCoordinates.height;
      setTimeout(() => {
        if (klavyeAcilincaRef.current) {
          klavyeAcilincaRef.current(yukseklik);
        } else {
          icRef.current?.scrollToEnd({ animated: true });
        }
      }, 50);
    });
    const gizlenince = Keyboard.addListener('keyboardWillHide', () => {
      setKlavyeYuksekligi(0);
    });
    return () => {
      gosterilince.remove();
      gizlenince.remove();
    };
  }, []);

  return (
    <ScrollView
      ref={(instance) => {
        icRef.current = instance;
        if (typeof disariAcilanRef === 'function') {
          disariAcilanRef(instance);
        } else if (disariAcilanRef) {
          disariAcilanRef.current = instance;
        }
      }}
      contentContainerClassName={contentContainerClassName}
      // Alt menu icerigin ustunde yuzer (#338); klavye acikken menu klavyenin arkasinda kalir, bu
      // yuzden ikisinden buyugu kadar yer birakilir.
      contentContainerStyle={{ paddingBottom: Math.max(klavyeYuksekligi, altMenuPayi) + altBosluk }}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  );
});

export default EkranKaydirici;
