import { forwardRef, useRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { useAltMenuPayi } from './KabukTabBar';
import { useKlavyeYuksekligi } from './useKlavyeYuksekligi';

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
 * cagriliyor ve hicbir sey yapmiyordu. Kaydirma, `useKlavyeYuksekligi`nin dolgu state'i guncellendikten
 * bir sonraki tick'te (kisa bir gecikmeyle) cagirdigi geri cagrimda yapilarak bu race ONLENIR.
 */
interface Props extends ScrollViewProps {
  /**
   * #274: klavye acilinca varsayilan davranis en alta (`scrollToEnd`) kaymaktir -- formu listenin
   * sonunda olan ekranlar icin. Formu listenin DISINDA olan ekran (antrenman: yuzer set paneli, #354)
   * bunun yerine kendi davranisini verir; ayni gecikmeli tick'te, klavye yuksekligiyle cagrilir.
   */
  onKlavyeAcildi?: (klavyeYuksekligi: number) => void;
}

const EkranKaydirici = forwardRef<ScrollView, Props>(function EkranKaydirici(
  { contentContainerClassName, children, onKlavyeAcildi, ...props },
  disariAcilanRef,
) {
  const icRef = useRef<ScrollView>(null);
  const altMenuPayi = useAltMenuPayi();
  const klavyeYuksekligi = useKlavyeYuksekligi((yukseklik) => {
    if (onKlavyeAcildi) {
      onKlavyeAcildi(yukseklik);
    } else {
      icRef.current?.scrollToEnd({ animated: true });
    }
  });

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
      contentContainerStyle={{ paddingBottom: Math.max(klavyeYuksekligi, altMenuPayi) }}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </ScrollView>
  );
});

export default EkranKaydirici;
