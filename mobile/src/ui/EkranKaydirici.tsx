import { forwardRef, useEffect, useRef, useState } from 'react';
import { ScrollView, Keyboard, Platform, type ScrollViewProps } from 'react-native';

/**
 * Metin alani + en altta gonder dugmesi olan HER ekranin ortak sarmalayicisi (Faz 3 sonrasi
 * simulator dokunma testinde bulundu): sarmalayici olmadan klavye acilinca `mt-auto` ile en alta
 * yaslanan bir form (AddSetForm, SablonFormu'ndaki Kaydet, vb.) klavyenin ARKASINA kayiyor --
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
const EkranKaydirici = forwardRef<ScrollView, ScrollViewProps>(function EkranKaydirici(
  { contentContainerClassName, children, ...props },
  disariAcilanRef,
) {
  const icRef = useRef<ScrollView>(null);
  const [klavyeYuksekligi, setKlavyeYuksekligi] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    // `Will` (Did degil) kullanilir: klavye animasyonuyla ES ZAMANLI baslar, "Did" animasyon
    // bittikten sonra geldigi icin gorunur bir sicrama/gecikme yaratirdi.
    const gosterilince = Keyboard.addListener('keyboardWillShow', (e) => {
      setKlavyeYuksekligi(e.endCoordinates.height);
      setTimeout(() => icRef.current?.scrollToEnd({ animated: true }), 50);
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
      contentContainerStyle={{ paddingBottom: klavyeYuksekligi }}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  );
});

export default EkranKaydirici;
